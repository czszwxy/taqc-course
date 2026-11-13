class UsersApi:
    def __init__(self, session, base_url):
        self.session = session
        self.base_url = base_url

    def get_user(self, user_id):
        url = f"{self.base_url}/users/{user_id}"
        status, body = self.session.get(url)
        if status == 200:
            return body
        if status == 404:
            return None
        raise RuntimeError(f"GET {url} failed: {status}")

    def emails(self, user_ids):
        users = [self.get_user(user_id) for user_id in user_ids]
        return [user["email"] for user in users if user is not None]
