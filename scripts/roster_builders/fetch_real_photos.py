import asyncio
import json
import bs4
import re
import aiohttp

async def fetch_photo(session, headers, p):
    # p['id'] looks like "baton-rouge-kingfish_noah_giesbrecht"
    # But wait, in the previous scrape_fphl.py, we didn't save the DigitalShift player_id!
    # I need to fetch the player_id from the original data, but it's not saved in fphl_rosters.json.
    pass

async def main():
    pass

