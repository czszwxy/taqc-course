import json

from errors import ApiError


def parse_json_body(text: str):
    try:
        return json.loads(text)
    except json.JSONDecodeError as e:
        raise ApiError(f"Response is not JSON: {text[:30]}") from e
