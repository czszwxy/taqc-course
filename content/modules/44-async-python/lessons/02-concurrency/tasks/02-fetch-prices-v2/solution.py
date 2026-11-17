import asyncio

from fakes import ProfileNotFound, ProfileService, ServiceError


async def load_profiles(service, user_ids):
    unique = list(dict.fromkeys(user_ids))
    results = await asyncio.gather(*(service.get_profile(user_id) for user_id in unique), return_exceptions=True)
    profiles = {}
    failed = []
    for user_id, result in zip(unique, results):
        if isinstance(result, Exception):
            failed.append(user_id)
        else:
            profiles[user_id] = result
    return profiles, failed
