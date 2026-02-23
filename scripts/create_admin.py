"""Seed an initial admin user via Supabase Admin API + profiles table."""

import asyncio

from src.config import settings
from src.database import async_session
from src.users.models import Profile
from supabase import create_client


ADMIN_EMAIL = "admin@example.com"
ADMIN_PASSWORD = "FacebookWorkflow"
ADMIN_USERNAME = "admin"


async def main():
    supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)

    auth_response = supabase.auth.admin.create_user(
        {
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD,
            "email_confirm": True,
        }
    )
    user_id = auth_response.user.id
    print(f"Created Supabase auth user: {user_id}")

    async with async_session() as db:
        profile = Profile(id=user_id, username=ADMIN_USERNAME, role="admin")
        db.add(profile)
        await db.commit()
        print(f"Created admin profile: {ADMIN_USERNAME} ({user_id})")


if __name__ == "__main__":
    asyncio.run(main())
