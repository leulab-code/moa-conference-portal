# Conference Management System — Django Backend

REST API backend for the MoA Conference Center booking system, built with Django and Django REST Framework.

## Stack
- **Python 3.10+**
- **Django 4.2+**
- **Django REST Framework 3.14+**
- **SQLite** (default, swap to PostgreSQL for production)
- **django-cors-headers** (pre-configured for local Vite dev server)

---

## Quick Start

### 1. Create & activate a virtual environment

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# macOS / Linux
source venv/bin/activate
```

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

### 3. Apply migrations

```bash
python manage.py makemigrations conference
python manage.py migrate
```

### 4. Seed initial data

Loads venues, services, and sample bookings from the frontend mock data:

```bash
python manage.py seed_data
```

### 5. Create an admin superuser (optional)

```bash
python manage.py createsuperuser
```

### 6. Run the development server

```bash
python manage.py runserver
```

API is available at **http://127.0.0.1:8000/api/**  
Admin panel at **http://127.0.0.1:8000/admin/**

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/venues/` | List all venues |
| `GET` | `/api/venues/{id}/` | Get venue detail |
| `GET` | `/api/technical-services/` | List all technical services |
| `GET` | `/api/support-services/` | List all support services |
| `GET` | `/api/bookings/` | List all bookings |
| `POST` | `/api/bookings/` | Create a new booking |
| `GET` | `/api/bookings/{id}/` | Get booking detail |
| `PUT/PATCH` | `/api/bookings/{id}/` | Update a booking |
| `DELETE` | `/api/bookings/{id}/` | Delete a booking |
| `PATCH` | `/api/bookings/{id}/update_status/` | Approve / reject / complete a booking |
| `PATCH` | `/api/bookings/{id}/cancel/` | Cancel a booking |

### Query Parameters (GET /api/bookings/)

| Param | Example | Description |
|-------|---------|-------------|
| `status` | `?status=reserved` | Filter by status |
| `venue` | `?venue=1` | Filter by venue ID |
| `date_from` | `?date_from=2026-03-01` | Bookings starting on or after |
| `date_to` | `?date_to=2026-03-31` | Bookings ending on or before |

---

## Create Booking — Example Request

```http
POST /api/bookings/
Content-Type: application/json

{
  "venue": 1,
  "event_title": "Annual Tech Summit",
  "event_description": "Ministry-wide tech summit.",
  "organizer_name": "Kebede Alemu",
  "organizer_email": "kebede@moa.gov.et",
  "organizer_phone": "+251911000001",
  "start_date": "2026-04-10",
  "end_date": "2026-04-10",
  "start_time": "09:00:00",
  "end_time": "17:00:00",
  "participant_count": 300,
  "technical_services": [1, 4, 5, 6],
  "support_services": [2, 3, 4]
}
```

## Update Status — Example Request

```http
PATCH /api/bookings/1/update_status/
Content-Type: application/json

{
  "status": "confirmed"
}
```

```http
PATCH /api/bookings/2/update_status/
Content-Type: application/json

{
  "status": "rejected",
  "rejection_reason": "Venue unavailable on that date."
}
```

---

## Connecting the Frontend

In the Vite frontend (`system-builder`), update `src/lib/` to call these endpoints instead of using mock data. CORS is pre-configured to allow any origin in development.

The Vite dev server runs on `http://localhost:5173` by default; the backend runs on `http://127.0.0.1:8000`.

---

## Project Structure

```
backend/
├── manage.py
├── requirements.txt
├── db.sqlite3                      # created after migrate
├── conference_backend/
│   ├── settings.py
│   ├── urls.py
│   └── wsgi.py
└── conference/
    ├── models.py          # Venue, TechnicalService, SupportService, Booking
    ├── serializers.py
    ├── views.py
    ├── urls.py
    ├── admin.py
    └── management/commands/
        └── seed_data.py
```
