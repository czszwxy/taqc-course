import pytest

from solution import mask_secrets


def test_email_and_card_in_one_message():
    text = "Refund for anna.k@example.com, card 4111 1111 1111 1234, order 1002"
    assert mask_secrets(text) == "Refund for a***@example.com, card **** **** **** 1234, order 1002"


def test_several_emails():
    """re.sub замінює всі збіги, не лише перший."""
    text = "From IVAN@Shop.ua to olha.m+promo@mail.example.com"
    assert mask_secrets(text) == "From I***@Shop.ua to o***@mail.example.com"


@pytest.mark.parametrize("card", ["4111 1111 1111 1234", "4111-1111-1111-1234", "4111111111111234"])
def test_card_formats(card):
    """Групи по 4 з пробілом, дефісом або без розділювача: (?:\\d{4}[ -]?){3}(\\d{4})."""
    assert mask_secrets(f"card {card} ok") == "card **** **** **** 1234 ok"


@pytest.mark.parametrize("text", ["order 1002", "call +380501112233", "id 123456789012", "17 digits 41111111111112345"])
def test_other_numbers_are_kept(text):
    """Лише 16 цифр картки; \\b на краях не дає замаскувати частину довшого числа."""
    assert mask_secrets(text) == text


def test_text_without_secrets_is_unchanged():
    assert mask_secrets("payment declined, try again") == "payment declined, try again"


def test_email_in_angle_brackets():
    assert mask_secrets("Reply-To: <support@gadgetly.test>") == "Reply-To: <s***@gadgetly.test>"
