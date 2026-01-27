#!/usr/bin/env python3
"""
One-time script to authenticate Telegram and create session file.
Run this locally before starting Docker.
"""
import asyncio
import os
from telethon import TelegramClient
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

API_ID = int(os.getenv('TELEGRAM_API_ID', '0'))
API_HASH = os.getenv('TELEGRAM_API_HASH', '')
PHONE = os.getenv('TELEGRAM_PHONE', '')

SESSION_NAME = 'pear_monitor'

async def main():
    print("=" * 60)
    print("Telegram Authentication Setup")
    print("=" * 60)
    print(f"API ID: {API_ID}")
    print(f"Phone: {PHONE}")
    print()
    
    if not API_ID or not API_HASH or not PHONE:
        print("❌ ERROR: Missing Telegram credentials in .env file")
        print("Please ensure TELEGRAM_API_ID, TELEGRAM_API_HASH, and TELEGRAM_PHONE are set")
        return
    
    print("Creating Telegram client...")
    client = TelegramClient(SESSION_NAME, API_ID, API_HASH)
    
    print("Connecting to Telegram...")
    await client.connect()
    
    if not await client.is_user_authorized():
        print()
        print("📱 Telegram will send you a verification code")
        print("Please enter it when prompted...")
        print()
        
        await client.send_code_request(PHONE)
        
        try:
            await client.sign_in(PHONE)
        except Exception as e:
            if 'code' in str(e).lower():
                # Code required
                code = input('Enter the code you received: ')
                try:
                    await client.sign_in(PHONE, code)
                except Exception as e2:
                    if 'password' in str(e2).lower():
                        # 2FA enabled
                        password = input('Two-factor authentication enabled. Enter your password: ')
                        await client.sign_in(password=password)
                    else:
                        raise e2
            else:
                raise e
    
    print()
    print("✅ Authentication successful!")
    print(f"✅ Session file created: {SESSION_NAME}.session")
    print()
    print("You can now start Docker and the Pear Monitor will work automatically.")
    print()
    
    # Test by getting dialogs
    print("Testing connection...")
    me = await client.get_me()
    print(f"✅ Logged in as: {me.first_name} (@{me.username})")
    
    await client.disconnect()
    print()
    print("=" * 60)
    print("Setup complete! You can now run: docker-compose restart backend")
    print("=" * 60)

if __name__ == '__main__':
    asyncio.run(main())
