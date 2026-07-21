from fastapi import FastAPI, Depends, HTTPException, status, Header, UploadFile, File, Form, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from typing import Optional, List, Any, Dict, Generator
from pathlib import Path
import sqlite3
import json
import os
import bcrypt
import jwt
import secrets
from datetime import datetime, timedelta

BASE_DIR = Path(__file__).resolve().parent
DB_DIR = BASE_DIR / 'database'
DB_PATH = DB_DIR / 'unistay.db'
SCHEMA_PATH = DB_DIR / 'schema.sql'
SEED_PATH = DB_DIR / 'seed.sql'
UPLOADS_DIR = BASE_DIR.parent / 'uploads'
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

JWT_SECRET = os.getenv('JWT_SECRET', 'unistay-secret-key-change-in-production')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRES_SECONDS = 7 * 24 * 3600

app = FastAPI(title='UniStay API', version='1.0.0')
app.add_middleware(
    CORSMiddleware,
    allow_origins=['http://localhost:5173', 'http://localhost:3000'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)
app.mount('/uploads', StaticFiles(directory=UPLOADS_DIR), name='uploads')


def row_to_dict(row: Optional[sqlite3.Row]) -> Optional[Dict[str, Any]]:
    if row is None:
        return None
    return {k: row[k] for k in row.keys()}


def parse_json_field(value: Any) -> Any:
    if value is None:
        return []
    if isinstance(value, str):
        try:
            return json.loads(value)
        except json.JSONDecodeError:
            return []
    if isinstance(value, (list, dict)):
        return value
    return []


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


def verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), password_hash.encode('utf-8'))


def create_token(user: Dict[str, Any]) -> str:
    payload = {
        'id': user['id'],
        'email': user['email'],
        'role': user['role'],
        'name': user['name'],
        'exp': datetime.utcnow() + timedelta(seconds=JWT_EXPIRES_SECONDS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def initialize_database() -> None:
    DB_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    with conn:
        with open(SCHEMA_PATH, 'r', encoding='utf-8') as schema_file:
            conn.executescript(schema_file.read())

        user_count = conn.execute('SELECT COUNT(*) as count FROM users').fetchone()['count']
        if user_count == 0:
            with open(SEED_PATH, 'r', encoding='utf-8') as seed_file:
                seed_sql = seed_file.read()
            password_hash = hash_password('password123')
            seed_sql = seed_sql.replace('$2a$10$placeholder', password_hash)
            conn.executescript(seed_sql)
    conn.close()


@app.on_event('startup')
def startup_event() -> None:
    initialize_database()


def get_db() -> Generator[sqlite3.Connection, None, None]:
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()


def decode_token(token: str) -> Dict[str, Any]:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Token expired.')
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Invalid token.')


def get_current_user(
    db: sqlite3.Connection = Depends(get_db),
    authorization: Optional[str] = Header(None),
) -> Dict[str, Any]:
    if not authorization or not authorization.lower().startswith('bearer '):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Access denied. No token provided.')
    token = authorization.split(' ', 1)[1]
    payload = decode_token(token)
    user = db.execute(
        'SELECT id, name, email, phone, role, avatar_url, is_verified, university, bio, created_at FROM users WHERE id = ?',
        (payload['id'],),
    ).fetchone()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='User not found.')
    return row_to_dict(user)


def get_optional_user(
    db: sqlite3.Connection = Depends(get_db),
    authorization: Optional[str] = Header(None),
) -> Optional[Dict[str, Any]]:
    if not authorization or not authorization.lower().startswith('bearer '):
        return None
    token = authorization.split(' ', 1)[1]
    try:
        payload = decode_token(token)
    except HTTPException:
        return None
    user = db.execute(
        'SELECT id, name, email, phone, role, avatar_url, is_verified, university, bio, created_at FROM users WHERE id = ?',
        (payload['id'],),
    ).fetchone()
    return row_to_dict(user) if user else None


def require_role(*roles: str):
    def role_checker(user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
        if user['role'] not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Insufficient permissions.')
        return user
    return role_checker


@app.get('/api/health')
def health_check() -> Dict[str, Any]:
    return {'status': 'ok', 'name': 'UniStay API', 'version': '1.0.0'}


@app.post('/api/auth/register')
def register(
    data: Dict[str, Any] = Body(...),
    db: sqlite3.Connection = Depends(get_db),
) -> Dict[str, Any]:
    name = data.get('name')
    email = data.get('email')
    password = data.get('password')
    phone = data.get('phone')
    role = data.get('role', 'student')
    university = data.get('university')

    if not name or not email or not password:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Name, email, and password are required.')
    if len(password) < 6:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Password must be at least 6 characters.')
    if role not in ['student', 'owner']:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Role must be student or owner.')

    existing = db.execute('SELECT id FROM users WHERE email = ?', (email,)).fetchone()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail='Email already registered.')

    password_hash = hash_password(password)
    cursor = db.cursor()
    cursor.execute(
        'INSERT INTO users (name, email, password_hash, phone, role, university) VALUES (?, ?, ?, ?, ?, ?)',
        (name, email, password_hash, phone, role, university),
    )
    db.commit()
    user_id = cursor.lastrowid
    user = db.execute(
        'SELECT id, name, email, role, is_verified, university, avatar_url, created_at FROM users WHERE id = ?',
        (user_id,),
    ).fetchone()
    token = create_token(row_to_dict(user))
    return {'user': row_to_dict(user), 'token': token}


@app.post('/api/auth/login')
def login(
    data: Dict[str, Any] = Body(...),
    db: sqlite3.Connection = Depends(get_db),
) -> Dict[str, Any]:
    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Email and password are required.')

    user = db.execute('SELECT * FROM users WHERE email = ?', (email,)).fetchone()
    if not user or not verify_password(password, user['password_hash']):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Invalid email or password.')

    response_user = row_to_dict(user)
    response_user.pop('password_hash', None)
    token = create_token(response_user)
    return {'user': response_user, 'token': token}


@app.get('/api/auth/me')
def get_me(user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    return user


@app.put('/api/auth/profile')
def update_profile(
    data: Dict[str, Any] = Body(...),
    db: sqlite3.Connection = Depends(get_db),
    user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    name = data.get('name')
    phone = data.get('phone')
    university = data.get('university')
    bio = data.get('bio')

    db.execute(
        'UPDATE users SET name = COALESCE(?, name), phone = COALESCE(?, phone), university = COALESCE(?, university), bio = COALESCE(?, bio), updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        (name, phone, university, bio, user['id']),
    )
    db.commit()
    updated = db.execute(
        'SELECT id, name, email, phone, role, avatar_url, is_verified, university, bio, created_at FROM users WHERE id = ?',
        (user['id'],),
    ).fetchone()
    return row_to_dict(updated)


@app.get('/api/listings')
def get_listings(
    page: int = 1,
    limit: int = 12,
    sort: str = 'newest',
    db: sqlite3.Connection = Depends(get_db),
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_user),
) -> Dict[str, Any]:
    offset = (page - 1) * limit
    order_by = 'l.created_at DESC'
    if sort == 'price_low':
        order_by = 'l.rent ASC'
    elif sort == 'price_high':
        order_by = 'l.rent DESC'
    elif sort == 'nearest':
        order_by = 'l.distance_from_uni ASC'
    elif sort == 'rating':
        order_by = 'avg_rating DESC'

    count_result = db.execute("SELECT COUNT(*) as total FROM listings WHERE status = 'approved'").fetchone()
    count_total = count_result['total']

    if current_user:
        sql = f'''
            SELECT l.*, u.name as owner_name, u.phone as owner_phone, u.is_verified as owner_verified,
                (SELECT image_url FROM listing_images WHERE listing_id = l.id AND is_primary = 1 LIMIT 1) as primary_image,
                (SELECT COUNT(*) FROM listing_images WHERE listing_id = l.id) as image_count,
                (SELECT AVG(overall) FROM reviews WHERE listing_id = l.id) as avg_rating,
                (SELECT COUNT(*) FROM reviews WHERE listing_id = l.id) as review_count,
                (SELECT COUNT(*) FROM favorites WHERE listing_id = l.id AND user_id = ?) as is_favorited
            FROM listings l
            JOIN users u ON l.owner_id = u.id
            WHERE l.status = 'approved'
            ORDER BY {order_by}
            LIMIT ? OFFSET ?
        '''
        rows = db.execute(sql, (current_user['id'], limit, offset)).fetchall()
    else:
        sql = f'''
            SELECT l.*, u.name as owner_name, u.phone as owner_phone, u.is_verified as owner_verified,
                (SELECT image_url FROM listing_images WHERE listing_id = l.id AND is_primary = 1 LIMIT 1) as primary_image,
                (SELECT COUNT(*) FROM listing_images WHERE listing_id = l.id) as image_count,
                (SELECT AVG(overall) FROM reviews WHERE listing_id = l.id) as avg_rating,
                (SELECT COUNT(*) FROM reviews WHERE listing_id = l.id) as review_count,
                0 as is_favorited
            FROM listings l
            JOIN users u ON l.owner_id = u.id
            WHERE l.status = 'approved'
            ORDER BY {order_by}
            LIMIT ? OFFSET ?
        '''
        rows = db.execute(sql, (limit, offset)).fetchall()

    listings = []
    for row in rows:
        item = row_to_dict(row)
        item['facilities'] = parse_json_field(item.get('facilities'))
        item['rules'] = parse_json_field(item.get('rules'))
        item['is_favorited'] = bool(item.get('is_favorited'))
        listings.append(item)

    return {
        'listings': listings,
        'pagination': {
            'page': page,
            'limit': limit,
            'total': count_total,
            'totalPages': (count_total + limit - 1) // limit,
        },
    }


@app.get('/api/listings/my')
def get_my_listings(
    db: sqlite3.Connection = Depends(get_db),
    user: Dict[str, Any] = Depends(get_current_user),
) -> List[Dict[str, Any]]:
    sql = '''
        SELECT l.*,
            (SELECT image_url FROM listing_images WHERE listing_id = l.id AND is_primary = 1 LIMIT 1) as primary_image,
            (SELECT COUNT(*) FROM listing_images WHERE listing_id = l.id) as image_count,
            (SELECT AVG(overall) FROM reviews WHERE listing_id = l.id) as avg_rating,
            (SELECT COUNT(*) FROM reviews WHERE listing_id = l.id) as review_count,
            (SELECT COUNT(*) FROM inquiries WHERE listing_id = l.id) as inquiry_count
        FROM listings l
        WHERE l.owner_id = ?
        ORDER BY l.created_at DESC
    '''
    rows = db.execute(sql, (user['id'],)).fetchall()
    result = []
    for row in rows:
        item = row_to_dict(row)
        item['facilities'] = parse_json_field(item.get('facilities'))
        item['rules'] = parse_json_field(item.get('rules'))
        result.append(item)
    return result


@app.get('/api/listings/{listing_id}')
def get_listing(
    listing_id: int,
    db: sqlite3.Connection = Depends(get_db),
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_user),
) -> Dict[str, Any]:
    if current_user:
        sql = '''
            SELECT l.*, u.name as owner_name, u.phone as owner_phone, u.email as owner_email,
                u.is_verified as owner_verified, u.avatar_url as owner_avatar, u.created_at as owner_since,
                (SELECT AVG(overall) FROM reviews WHERE listing_id = l.id) as avg_rating,
                (SELECT COUNT(*) FROM reviews WHERE listing_id = l.id) as review_count,
                (SELECT COUNT(*) FROM favorites WHERE listing_id = l.id AND user_id = ?) as is_favorited
            FROM listings l
            JOIN users u ON l.owner_id = u.id
            WHERE l.id = ?
        '''
        listing = db.execute(sql, (current_user['id'], listing_id)).fetchone()
    else:
        sql = '''
            SELECT l.*, u.name as owner_name, u.phone as owner_phone, u.email as owner_email,
                u.is_verified as owner_verified, u.avatar_url as owner_avatar, u.created_at as owner_since,
                (SELECT AVG(overall) FROM reviews WHERE listing_id = l.id) as avg_rating,
                (SELECT COUNT(*) FROM reviews WHERE listing_id = l.id) as review_count,
                0 as is_favorited
            FROM listings l
            JOIN users u ON l.owner_id = u.id
            WHERE l.id = ?
        '''
        listing = db.execute(sql, (listing_id,)).fetchone()

    if not listing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Listing not found.')

    images = db.execute('SELECT * FROM listing_images WHERE listing_id = ? ORDER BY sort_order', (listing_id,)).fetchall()
    reviews = db.execute(
        '''
        SELECT r.*, u.name as reviewer_name, u.avatar_url as reviewer_avatar
        FROM reviews r
        JOIN users u ON r.student_id = u.id
        WHERE r.listing_id = ?
        ORDER BY r.created_at DESC
        ''',
        (listing_id,),
    ).fetchall()
    db.execute('UPDATE listings SET views_count = views_count + 1 WHERE id = ?', (listing_id,))
    db.commit()

    item = row_to_dict(listing)
    item['facilities'] = parse_json_field(item.get('facilities'))
    item['rules'] = parse_json_field(item.get('rules'))
    item['is_favorited'] = bool(item.get('is_favorited'))
    item['images'] = [row_to_dict(row) for row in images]
    item['reviews'] = [row_to_dict(row) for row in reviews]
    return item


def save_upload_file(file: UploadFile) -> str:
    file_extension = Path(file.filename).suffix.lower()
    if file_extension not in {'.jpg', '.jpeg', '.png', '.webp'}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Only JPG, PNG, and WebP images are allowed.')
    filename = f"{secrets.token_hex(8)}-{int(datetime.utcnow().timestamp())}{file_extension}"
    destination = UPLOADS_DIR / filename
    with destination.open('wb') as buffer:
        buffer.write(file.file.read())
    return f'/uploads/{filename}'


@app.post('/api/listings')
def create_listing(
    title: str = Form(...),
    rent: float = Form(...),
    location: str = Form(...),
    description: Optional[str] = Form(None),
    address: Optional[str] = Form(None),
    latitude: Optional[float] = Form(None),
    longitude: Optional[float] = Form(None),
    distance_from_uni: Optional[float] = Form(None),
    room_type: str = Form('single'),
    gender_pref: str = Form('any'),
    max_occupants: int = Form(1),
    facilities: Optional[str] = Form(None),
    rules: Optional[str] = Form(None),
    images: Optional[List[UploadFile]] = File(None),
    db: sqlite3.Connection = Depends(get_db),
    user: Dict[str, Any] = Depends(require_role('owner', 'admin')),
) -> Dict[str, Any]:
    if not title or not rent or not location:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Title, rent, and location are required.')

    facilities_value = facilities if facilities is not None else json.dumps([])
    rules_value = rules if rules is not None else json.dumps([])

    result = db.execute(
        '''
        INSERT INTO listings (owner_id, title, description, rent, location, address, latitude, longitude, distance_from_uni, room_type, gender_pref, max_occupants, facilities, rules, status, expires_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '+30 days'))
        ''',
        (
            user['id'],
            title,
            description or '',
            rent,
            location,
            address or '',
            latitude,
            longitude,
            distance_from_uni,
            room_type,
            gender_pref,
            max_occupants,
            facilities_value,
            rules_value,
            'approved' if user['role'] == 'admin' else 'pending',
        ),
    )
    listing_id = result.lastrowid

    if images:
        for index, file in enumerate(images):
            url = save_upload_file(file)
            db.execute(
                'INSERT INTO listing_images (listing_id, image_url, is_primary, sort_order) VALUES (?, ?, ?, ?)',
                (listing_id, url, 1 if index == 0 else 0, index),
            )

    db.commit()
    listing = db.execute('SELECT * FROM listings WHERE id = ?', (listing_id,)).fetchone()
    images_rows = db.execute('SELECT * FROM listing_images WHERE listing_id = ?', (listing_id,)).fetchall()
    result = row_to_dict(listing)
    result['facilities'] = parse_json_field(result.get('facilities'))
    result['rules'] = parse_json_field(result.get('rules'))
    result['images'] = [row_to_dict(row) for row in images_rows]
    return result


@app.put('/api/listings/{listing_id}')
def update_listing(
    listing_id: int,
    data: Dict[str, Any] = Body(...),
    db: sqlite3.Connection = Depends(get_db),
    user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    listing = db.execute('SELECT * FROM listings WHERE id = ?', (listing_id,)).fetchone()
    if not listing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Listing not found.')
    if listing['owner_id'] != user['id'] and user['role'] != 'admin':
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='You can only edit your own listings.')

    title = data.get('title')
    description = data.get('description')
    rent = data.get('rent')
    location = data.get('location')
    address = data.get('address')
    latitude = data.get('latitude')
    longitude = data.get('longitude')
    distance_from_uni = data.get('distance_from_uni')
    room_type = data.get('room_type')
    gender_pref = data.get('gender_pref')
    max_occupants = data.get('max_occupants')
    facilities = data.get('facilities')
    rules = data.get('rules')

    facilities_value = json.dumps(facilities) if facilities is not None else None
    rules_value = json.dumps(rules) if rules is not None else None

    db.execute(
        '''
        UPDATE listings SET
            title = COALESCE(?, title),
            description = COALESCE(?, description),
            rent = COALESCE(?, rent),
            location = COALESCE(?, location),
            address = COALESCE(?, address),
            latitude = COALESCE(?, latitude),
            longitude = COALESCE(?, longitude),
            distance_from_uni = COALESCE(?, distance_from_uni),
            room_type = COALESCE(?, room_type),
            gender_pref = COALESCE(?, gender_pref),
            max_occupants = COALESCE(?, max_occupants),
            facilities = COALESCE(?, facilities),
            rules = COALESCE(?, rules),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        ''',
        (
            title,
            description,
            rent,
            location,
            address,
            latitude,
            longitude,
            distance_from_uni,
            room_type,
            gender_pref,
            max_occupants,
            facilities_value,
            rules_value,
            listing_id,
        ),
    )
    db.commit()
    updated = db.execute('SELECT * FROM listings WHERE id = ?', (listing_id,)).fetchone()
    result = row_to_dict(updated)
    result['facilities'] = parse_json_field(result.get('facilities'))
    result['rules'] = parse_json_field(result.get('rules'))
    return result


@app.delete('/api/listings/{listing_id}')
def delete_listing(
    listing_id: int,
    db: sqlite3.Connection = Depends(get_db),
    user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    listing = db.execute('SELECT * FROM listings WHERE id = ?', (listing_id,)).fetchone()
    if not listing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Listing not found.')
    if listing['owner_id'] != user['id'] and user['role'] != 'admin':
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='You can only delete your own listings.')
    db.execute('DELETE FROM listings WHERE id = ?', (listing_id,))
    db.commit()
    return {'message': 'Listing deleted successfully.'}


@app.post('/api/inquiries')
def create_inquiry(
    data: Dict[str, Any] = Body(...),
    db: sqlite3.Connection = Depends(get_db),
    user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    listing_id = data.get('listing_id')
    message = data.get('message')
    if not listing_id or not message:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Listing ID and message are required.')
    listing = db.execute("SELECT * FROM listings WHERE id = ? AND status = 'approved'", (listing_id,)).fetchone()
    if not listing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Listing not found or not available.')
    if listing['owner_id'] == user['id']:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='You cannot inquire on your own listing.')

    cursor = db.cursor()
    cursor.execute(
        'INSERT INTO inquiries (student_id, listing_id, message) VALUES (?, ?, ?)',
        (user['id'], listing_id, message),
    )
    db.commit()
    inquiry_id = cursor.lastrowid
    inquiry = db.execute(
        '''
        SELECT i.*, l.title as listing_title, u.name as student_name
        FROM inquiries i
        JOIN listings l ON i.listing_id = l.id
        JOIN users u ON i.student_id = u.id
        WHERE i.id = ?
        ''',
        (inquiry_id,),
    ).fetchone()
    return row_to_dict(inquiry)


@app.get('/api/inquiries/sent')
def get_sent_inquiries(
    db: sqlite3.Connection = Depends(get_db),
    user: Dict[str, Any] = Depends(get_current_user),
) -> List[Dict[str, Any]]:
    rows = db.execute(
        '''
        SELECT i.*, l.title as listing_title, l.rent, l.location, l.room_type,
            u.name as owner_name,
            (SELECT image_url FROM listing_images WHERE listing_id = l.id AND is_primary = 1 LIMIT 1) as listing_image
        FROM inquiries i
        JOIN listings l ON i.listing_id = l.id
        JOIN users u ON l.owner_id = u.id
        WHERE i.student_id = ?
        ORDER BY i.created_at DESC
        ''',
        (user['id'],),
    ).fetchall()
    return [row_to_dict(row) for row in rows]


@app.get('/api/inquiries/received')
def get_received_inquiries(
    db: sqlite3.Connection = Depends(get_db),
    user: Dict[str, Any] = Depends(get_current_user),
) -> List[Dict[str, Any]]:
    rows = db.execute(
        '''
        SELECT i.*, l.title as listing_title, l.rent,
            u.name as student_name, u.email as student_email, u.phone as student_phone, u.university as student_university
        FROM inquiries i
        JOIN listings l ON i.listing_id = l.id
        JOIN users u ON i.student_id = u.id
        WHERE l.owner_id = ?
        ORDER BY i.created_at DESC
        ''',
        (user['id'],),
    ).fetchall()
    return [row_to_dict(row) for row in rows]


@app.put('/api/inquiries/{inquiry_id}/respond')
def respond_inquiry(
    inquiry_id: int,
    data: Dict[str, Any] = Body(...),
    db: sqlite3.Connection = Depends(get_db),
    user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    status_value = data.get('status')
    owner_response = data.get('owner_response')
    if status_value not in ['accepted', 'rejected']:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Status must be accepted or rejected.')
    inquiry = db.execute(
        '''
        SELECT i.*, l.owner_id
        FROM inquiries i
        JOIN listings l ON i.listing_id = l.id
        WHERE i.id = ?
        ''',
        (inquiry_id,),
    ).fetchone()
    if not inquiry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Inquiry not found.')
    if inquiry['owner_id'] != user['id'] and user['role'] != 'admin':
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='You can only respond to inquiries for your listings.')

    db.execute(
        'UPDATE inquiries SET status = ?, owner_response = ?, responded_at = CURRENT_TIMESTAMP WHERE id = ?',
        (status_value, owner_response or '', inquiry_id),
    )
    db.commit()
    updated = db.execute(
        '''
        SELECT i.*, l.title as listing_title, u.name as student_name
        FROM inquiries i
        JOIN listings l ON i.listing_id = l.id
        JOIN users u ON i.student_id = u.id
        WHERE i.id = ?
        ''',
        (inquiry_id,),
    ).fetchone()
    return row_to_dict(updated)


@app.post('/api/reviews')
def create_review(
    data: Dict[str, Any] = Body(...),
    db: sqlite3.Connection = Depends(get_db),
    user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    listing_id = data.get('listing_id')
    cleanliness = data.get('cleanliness')
    safety = data.get('safety')
    internet = data.get('internet')
    landlord = data.get('landlord')
    value_for_money = data.get('value_for_money')
    comment = data.get('comment', '')

    required = [listing_id, cleanliness, safety, internet, landlord, value_for_money]
    if any(value is None for value in required):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='All rating fields are required.')
    ratings = [cleanliness, safety, internet, landlord, value_for_money]
    if any(r < 1 or r > 5 for r in ratings):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Ratings must be between 1 and 5.')

    listing = db.execute('SELECT * FROM listings WHERE id = ?', (listing_id,)).fetchone()
    if not listing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Listing not found.')
    if listing['owner_id'] == user['id']:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Cannot review own listing.')

    existing = db.execute('SELECT id FROM reviews WHERE student_id = ? AND listing_id = ?', (user['id'], listing_id)).fetchone()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail='Already reviewed.')

    overall = sum(ratings) / len(ratings)
    cursor = db.cursor()
    cursor.execute(
        'INSERT INTO reviews (student_id, listing_id, cleanliness, safety, internet, landlord, value_for_money, overall, comment) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        (user['id'], listing_id, cleanliness, safety, internet, landlord, value_for_money, overall, comment),
    )
    db.commit()
    review_id = cursor.lastrowid
    review = db.execute(
        'SELECT r.*, u.name as reviewer_name FROM reviews r JOIN users u ON r.student_id = u.id WHERE r.id = ?',
        (review_id,),
    ).fetchone()
    return row_to_dict(review)


@app.get('/api/reviews/listing/{listing_id}')
def get_reviews_for_listing(listing_id: int, db: sqlite3.Connection = Depends(get_db)) -> Dict[str, Any]:
    reviews = db.execute(
        'SELECT r.*, u.name as reviewer_name FROM reviews r JOIN users u ON r.student_id = u.id WHERE r.listing_id = ? ORDER BY r.created_at DESC',
        (listing_id,),
    ).fetchall()
    stats = db.execute(
        '''
        SELECT AVG(overall) as avg_overall, AVG(cleanliness) as avg_cleanliness, AVG(safety) as avg_safety,
            AVG(internet) as avg_internet, AVG(landlord) as avg_landlord, AVG(value_for_money) as avg_value, COUNT(*) as total
        FROM reviews WHERE listing_id = ?
        ''',
        (listing_id,),
    ).fetchone()
    return {'reviews': [row_to_dict(row) for row in reviews], 'stats': row_to_dict(stats)}


@app.post('/api/favorites/{listing_id}')
def toggle_favorite(
    listing_id: int,
    db: sqlite3.Connection = Depends(get_db),
    user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    existing = db.execute('SELECT id FROM favorites WHERE user_id = ? AND listing_id = ?', (user['id'], listing_id)).fetchone()
    if existing:
        db.execute('DELETE FROM favorites WHERE id = ?', (existing['id'],))
        db.commit()
        return {'favorited': False, 'message': 'Removed from favorites.'}
    db.execute('INSERT INTO favorites (user_id, listing_id) VALUES (?, ?)', (user['id'], listing_id))
    db.commit()
    return {'favorited': True, 'message': 'Added to favorites.'}


@app.get('/api/favorites')
def get_favorites(
    db: sqlite3.Connection = Depends(get_db),
    user: Dict[str, Any] = Depends(get_current_user),
) -> List[Dict[str, Any]]:
    rows = db.execute(
        '''
        SELECT l.*, u.name as owner_name, u.is_verified as owner_verified, f.created_at as favorited_at,
            (SELECT image_url FROM listing_images WHERE listing_id = l.id AND is_primary = 1 LIMIT 1) as primary_image,
            (SELECT AVG(overall) FROM reviews WHERE listing_id = l.id) as avg_rating,
            (SELECT COUNT(*) FROM reviews WHERE listing_id = l.id) as review_count,
            1 as is_favorited
        FROM favorites f
        JOIN listings l ON f.listing_id = l.id
        JOIN users u ON l.owner_id = u.id
        WHERE f.user_id = ?
        ORDER BY f.created_at DESC
        ''',
        (user['id'],),
    ).fetchall()
    favorites = []
    for row in rows:
        item = row_to_dict(row)
        item['facilities'] = parse_json_field(item.get('facilities'))
        item['rules'] = parse_json_field(item.get('rules'))
        item['is_favorited'] = True
        favorites.append(item)
    return favorites


@app.get('/api/search')
def search_listings(
    q: Optional[str] = None,
    rent_min: Optional[float] = None,
    rent_max: Optional[float] = None,
    room_type: Optional[str] = None,
    gender_pref: Optional[str] = None,
    distance_max: Optional[float] = None,
    facilities: Optional[str] = None,
    location: Optional[str] = None,
    sort: str = 'newest',
    page: int = 1,
    limit: int = 12,
    db: sqlite3.Connection = Depends(get_db),
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_user),
) -> Dict[str, Any]:
    conditions = ["l.status = 'approved'"]
    params: List[Any] = []
    if q:
        conditions.append('(l.title LIKE ? OR l.description LIKE ? OR l.location LIKE ? OR l.address LIKE ?)')
        term = f'%{q}%'
        params.extend([term, term, term, term])
    if rent_min is not None:
        conditions.append('l.rent >= ?')
        params.append(rent_min)
    if rent_max is not None:
        conditions.append('l.rent <= ?')
        params.append(rent_max)
    if room_type:
        conditions.append('l.room_type = ?')
        params.append(room_type)
    if gender_pref:
        conditions.append("(l.gender_pref = ? OR l.gender_pref = 'any')")
        params.append(gender_pref)
    if distance_max is not None:
        conditions.append('l.distance_from_uni <= ?')
        params.append(distance_max)
    if location:
        conditions.append('l.location LIKE ?')
        params.append(f'%{location}%')
    if facilities:
        for facility in facilities.split(','):
            conditions.append('l.facilities LIKE ?')
            params.append(f'%{facility.strip()}%')

    where_clause = ' AND '.join(conditions)
    order_by = 'l.created_at DESC'
    if sort == 'price_low':
        order_by = 'l.rent ASC'
    elif sort == 'price_high':
        order_by = 'l.rent DESC'
    elif sort == 'nearest':
        order_by = 'l.distance_from_uni ASC'
    elif sort == 'rating':
        order_by = 'avg_rating DESC'

    offset = (page - 1) * limit
    count_query = f'SELECT COUNT(*) as total FROM listings l WHERE {where_clause}'
    total = db.execute(count_query, tuple(params)).fetchone()['total']

    if current_user:
        listing_query = f'''
            SELECT l.*, u.name as owner_name, u.is_verified as owner_verified,
                (SELECT image_url FROM listing_images WHERE listing_id = l.id AND is_primary = 1 LIMIT 1) as primary_image,
                (SELECT AVG(overall) FROM reviews WHERE listing_id = l.id) as avg_rating,
                (SELECT COUNT(*) FROM reviews WHERE listing_id = l.id) as review_count,
                (SELECT COUNT(*) FROM favorites WHERE listing_id = l.id AND user_id = ?) as is_favorited
            FROM listings l
            JOIN users u ON l.owner_id = u.id
            WHERE {where_clause}
            ORDER BY {order_by}
            LIMIT ? OFFSET ?
        '''
        rows = db.execute(listing_query, tuple(params) + (current_user['id'], limit, offset)).fetchall()
    else:
        listing_query = f'''
            SELECT l.*, u.name as owner_name, u.is_verified as owner_verified,
                (SELECT image_url FROM listing_images WHERE listing_id = l.id AND is_primary = 1 LIMIT 1) as primary_image,
                (SELECT AVG(overall) FROM reviews WHERE listing_id = l.id) as avg_rating,
                (SELECT COUNT(*) FROM reviews WHERE listing_id = l.id) as review_count,
                0 as is_favorited
            FROM listings l
            JOIN users u ON l.owner_id = u.id
            WHERE {where_clause}
            ORDER BY {order_by}
            LIMIT ? OFFSET ?
        '''
        rows = db.execute(listing_query, tuple(params) + (limit, offset)).fetchall()

    listings = []
    for row in rows:
        item = row_to_dict(row)
        item['facilities'] = parse_json_field(item.get('facilities'))
        item['rules'] = parse_json_field(item.get('rules'))
        item['is_favorited'] = bool(item.get('is_favorited'))
        listings.append(item)

    return {
        'listings': listings,
        'pagination': {
            'page': page,
            'limit': limit,
            'total': total,
            'totalPages': (total + limit - 1) // limit,
        },
        'filters': {
            'q': q,
            'rent_min': rent_min,
            'rent_max': rent_max,
            'room_type': room_type,
            'gender_pref': gender_pref,
            'distance_max': distance_max,
            'location': location,
            'facilities': facilities,
        },
    }


@app.post('/api/roommate/profile')
def save_roommate_profile(
    data: Dict[str, Any] = Body(...),
    db: sqlite3.Connection = Depends(get_db),
    user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    budget_min = data.get('budget_min')
    budget_max = data.get('budget_max')
    sleep_schedule = data.get('sleep_schedule', 'normal')
    study_habits = data.get('study_habits', 'moderate')
    smoking = 1 if data.get('smoking') else 0
    gender_pref = data.get('gender_pref', 'any')
    cleanliness_level = data.get('cleanliness_level', 'medium')
    bio = data.get('bio', '')

    existing = db.execute('SELECT id FROM roommate_profiles WHERE user_id = ?', (user['id'],)).fetchone()
    if existing:
        db.execute(
            '''
            UPDATE roommate_profiles SET budget_min=?, budget_max=?, sleep_schedule=?, study_habits=?, smoking=?, gender_pref=?, cleanliness_level=?, bio=?, updated_at=CURRENT_TIMESTAMP WHERE user_id=?
            ''',
            (budget_min, budget_max, sleep_schedule, study_habits, smoking, gender_pref, cleanliness_level, bio, user['id']),
        )
    else:
        db.execute(
            '''
            INSERT INTO roommate_profiles (user_id, budget_min, budget_max, sleep_schedule, study_habits, smoking, gender_pref, cleanliness_level, bio)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''',
            (user['id'], budget_min, budget_max, sleep_schedule, study_habits, smoking, gender_pref, cleanliness_level, bio),
        )
    db.commit()
    profile = db.execute(
        'SELECT rp.*, u.name, u.university FROM roommate_profiles rp JOIN users u ON rp.user_id = u.id WHERE rp.user_id = ?',
        (user['id'],),
    ).fetchone()
    return row_to_dict(profile)


@app.get('/api/roommate/profile')
def get_roommate_profile(
    db: sqlite3.Connection = Depends(get_db),
    user: Dict[str, Any] = Depends(get_current_user),
) -> Optional[Dict[str, Any]]:
    profile = db.execute(
        'SELECT rp.*, u.name, u.university FROM roommate_profiles rp JOIN users u ON rp.user_id = u.id WHERE rp.user_id = ?',
        (user['id'],),
    ).fetchone()
    return row_to_dict(profile) if profile else None


@app.get('/api/roommate/matches')
def roommate_matches(
    db: sqlite3.Connection = Depends(get_db),
    user: Dict[str, Any] = Depends(get_current_user),
) -> List[Dict[str, Any]]:
    my_profile = db.execute('SELECT * FROM roommate_profiles WHERE user_id = ?', (user['id'],)).fetchone()
    if not my_profile:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Create your roommate profile first.')

    candidates = db.execute(
        'SELECT rp.*, u.name, u.university, u.avatar_url FROM roommate_profiles rp JOIN users u ON rp.user_id = u.id WHERE rp.user_id != ?',
        (user['id'],),
    ).fetchall()

    matches = []
    for candidate in candidates:
        c = row_to_dict(candidate)
        score = 0
        max_score = 0

        max_score += 3
        if my_profile['budget_max'] >= c['budget_min'] and my_profile['budget_min'] <= c['budget_max']:
            score += 3
        elif abs((my_profile['budget_max'] or 0) - (c['budget_min'] or 0)) < 3000 or abs((my_profile['budget_min'] or 0) - (c['budget_max'] or 0)) < 3000:
            score += 1

        max_score += 2
        if my_profile['sleep_schedule'] == c['sleep_schedule']:
            score += 2
        elif my_profile['sleep_schedule'] == 'normal' or c['sleep_schedule'] == 'normal':
            score += 1

        max_score += 2
        if my_profile['study_habits'] == c['study_habits']:
            score += 2
        elif my_profile['study_habits'] == 'moderate' or c['study_habits'] == 'moderate':
            score += 1

        max_score += 3
        if my_profile['smoking'] == c['smoking']:
            score += 3

        max_score += 2
        if my_profile['gender_pref'] == 'any' or c['gender_pref'] == 'any' or my_profile['gender_pref'] == c['gender_pref']:
            score += 2

        max_score += 2
        if my_profile['cleanliness_level'] == c['cleanliness_level']:
            score += 2
        elif my_profile['cleanliness_level'] == 'medium' or c['cleanliness_level'] == 'medium':
            score += 1

        compatibility = round((score / max_score) * 100) if max_score > 0 else 0
        c['compatibility'] = compatibility
        c['score'] = score
        matches.append(c)

    return sorted(matches, key=lambda item: item['compatibility'], reverse=True)


@app.get('/api/admin/listings/pending')
def admin_pending_listings(
    db: sqlite3.Connection = Depends(get_db),
    user: Dict[str, Any] = Depends(require_role('admin')),
) -> List[Dict[str, Any]]:
    rows = db.execute(
        '''
        SELECT l.*, u.name as owner_name, u.email as owner_email, u.phone as owner_phone,
            (SELECT image_url FROM listing_images WHERE listing_id = l.id AND is_primary = 1 LIMIT 1) as primary_image,
            (SELECT COUNT(*) FROM listing_images WHERE listing_id = l.id) as image_count
        FROM listings l
        JOIN users u ON l.owner_id = u.id
        WHERE l.status = 'pending'
        ORDER BY l.created_at ASC
        ''',
        (),
    ).fetchall()
    result = []
    for row in rows:
        item = row_to_dict(row)
        item['facilities'] = parse_json_field(item.get('facilities'))
        item['rules'] = parse_json_field(item.get('rules'))
        result.append(item)
    return result


@app.put('/api/admin/listings/{listing_id}/approve')
def admin_approve_listing(
    listing_id: int,
    db: sqlite3.Connection = Depends(get_db),
    user: Dict[str, Any] = Depends(require_role('admin')),
) -> Dict[str, str]:
    db.execute("UPDATE listings SET status = 'approved', is_verified = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?", (listing_id,))
    db.commit()
    return {'message': 'Listing approved.'}


@app.put('/api/admin/listings/{listing_id}/reject')
def admin_reject_listing(
    listing_id: int,
    db: sqlite3.Connection = Depends(get_db),
    user: Dict[str, Any] = Depends(require_role('admin')),
) -> Dict[str, str]:
    db.execute("UPDATE listings SET status = 'rejected', updated_at = CURRENT_TIMESTAMP WHERE id = ?", (listing_id,))
    db.commit()
    return {'message': 'Listing rejected.'}


@app.get('/api/admin/analytics')
def admin_analytics(
    db: sqlite3.Connection = Depends(get_db),
    user: Dict[str, Any] = Depends(require_role('admin')),
) -> Dict[str, Any]:
    totals = {
        'users': db.execute('SELECT COUNT(*) as count FROM users').fetchone()['count'],
        'students': db.execute("SELECT COUNT(*) as count FROM users WHERE role = 'student'").fetchone()['count'],
        'owners': db.execute("SELECT COUNT(*) as count FROM users WHERE role = 'owner'").fetchone()['count'],
        'listings': db.execute('SELECT COUNT(*) as count FROM listings').fetchone()['count'],
        'approved': db.execute("SELECT COUNT(*) as count FROM listings WHERE status = 'approved'").fetchone()['count'],
        'pending': db.execute("SELECT COUNT(*) as count FROM listings WHERE status = 'pending'").fetchone()['count'],
        'reviews': db.execute('SELECT COUNT(*) as count FROM reviews').fetchone()['count'],
        'inquiries': db.execute('SELECT COUNT(*) as count FROM inquiries').fetchone()['count'],
        'pending_inquiries': db.execute("SELECT COUNT(*) as count FROM inquiries WHERE status = 'pending'").fetchone()['count'],
        'reports': db.execute('SELECT COUNT(*) as count FROM reports').fetchone()['count'],
    }
    avg_rent = db.execute("SELECT AVG(rent) as avg FROM listings WHERE status = 'approved'").fetchone()['avg'] or 0
    recent_listings = db.execute(
        "SELECT l.*, u.name as owner_name FROM listings l JOIN users u ON l.owner_id = u.id ORDER BY l.created_at DESC LIMIT 5",
    ).fetchall()
    recent_users = db.execute(
        'SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC LIMIT 5',
    ).fetchall()
    return {
        'users': {'total': totals['users'], 'students': totals['students'], 'owners': totals['owners']},
        'listings': {'total': totals['listings'], 'approved': totals['approved'], 'pending': totals['pending']},
        'reviews': {'total': totals['reviews']},
        'inquiries': {'total': totals['inquiries'], 'pending': totals['pending_inquiries']},
        'reports': {'total': totals['reports']},
        'avgRent': round(avg_rent),
        'recentListings': [
            {**row_to_dict(row), 'facilities': parse_json_field(row_to_dict(row).get('facilities'))} for row in recent_listings
        ],
        'recentUsers': [row_to_dict(row) for row in recent_users],
    }


@app.get('/api/admin/users')
def admin_users(
    db: sqlite3.Connection = Depends(get_db),
    user: Dict[str, Any] = Depends(require_role('admin')),
) -> List[Dict[str, Any]]:
    rows = db.execute('SELECT id, name, email, phone, role, is_verified, university, created_at FROM users ORDER BY created_at DESC').fetchall()
    return [row_to_dict(row) for row in rows]


@app.get('/api/admin/reports')
def admin_reports(
    db: sqlite3.Connection = Depends(get_db),
    user: Dict[str, Any] = Depends(require_role('admin')),
) -> List[Dict[str, Any]]:
    rows = db.execute(
        '''
        SELECT r.*, u.name as reporter_name, l.title as listing_title
        FROM reports r
        JOIN users u ON r.reporter_id = u.id
        JOIN listings l ON r.listing_id = l.id
        ORDER BY r.created_at DESC
        ''',
    ).fetchall()
    return [row_to_dict(row) for row in rows]


@app.post('/api/chat')
def chat(
    data: Dict[str, Any] = Body(...),
    db: sqlite3.Connection = Depends(get_db),
    user: Optional[Dict[str, Any]] = Depends(get_optional_user),
) -> Dict[str, Any]:
    """Simple rule-based chatbot endpoint.

    Supports:
    - Searching listings by text (if message contains keywords like 'list', 'search', 'show', 'near')
    - Basic greetings
    - Fallback message with guidance
    """
    msg_raw = (data.get('message') or '').strip()
    msg = msg_raw.lower()
    if not msg:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Message is required.')

    # Listing search intent
    if any(k in msg for k in ('list', 'search', 'show', 'near')):
        term = f"%{msg_raw}%"
        rows = db.execute(
            "SELECT l.id, l.title, l.rent, l.location, (SELECT image_url FROM listing_images WHERE listing_id = l.id AND is_primary = 1 LIMIT 1) as image FROM listings l WHERE l.status = 'approved' AND (l.title LIKE ? OR l.description LIKE ? OR l.location LIKE ?) LIMIT 6",
            (term, term, term),
        ).fetchall()
        results = []
        for r in rows:
            row = row_to_dict(r)
            results.append({
                'id': row['id'],
                'title': row['title'],
                'rent': row['rent'],
                'location': row['location'],
                'image': row.get('image'),
            })
        if results:
            return {'type': 'listings', 'message': f'Found {len(results)} matching listings.', 'results': results}
        return {'type': 'text', 'message': 'No matching listings found. Try a different location or keyword.'}

    # Greetings
    if any(g in msg for g in ('hi', 'hello', 'hey')):
        return {'type': 'text', 'message': 'Hi! I can help you find listings. Try: "show listings near Homagama" or "search cheap rooms".'}

    # Help / fallback
    return {'type': 'text', 'message': 'I can help with searching listings and answering basic questions. Try: "show listings near <location>".'}
