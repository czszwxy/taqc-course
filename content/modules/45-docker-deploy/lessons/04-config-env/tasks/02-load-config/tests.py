import pytest

from solution import Config, ConfigError, load_config

DB = "postgresql://shop:secret@db:5432/shop"
BASE = {"DATABASE_URL": DB, "ALLOWED_HOSTS": "shop.example.com"}


def env(**changes):
    result = dict(BASE)
    for key, value in changes.items():
        if value is None:
            result.pop(key, None)
        else:
            result[key] = value
    return result


def problem_names(**changes):
    with pytest.raises(ConfigError) as caught:
        load_config(env(**changes))
    return [problem.split()[0] for problem in caught.value.problems]


def test_defaults():
    """Лише обов'язкове — решта за замовчуванням."""
    assert load_config(BASE) == Config(DB, 8000, False, ("shop.example.com",), "INFO")


def test_everything_set():
    """Усі змінні задані."""
    config = load_config(env(PORT="9000", DEBUG="true", ALLOWED_HOSTS="a.example.com,b.example.com", LOG_LEVEL="warning"))
    assert config == Config(DB, 9000, True, ("a.example.com", "b.example.com"), "WARNING")


def test_unknown_variables_ignored():
    """Інші змінні середовища (PATH, HOME…) не заважають."""
    assert load_config(env(PATH="/usr/bin", HOME="/root")).port == 8000


def test_values_are_stripped():
    """Пробіли по краях обрізаються."""
    config = load_config(env(DATABASE_URL=f"  {DB} ", PORT=" 8080 ", LOG_LEVEL=" debug "))
    assert (config.database_url, config.port, config.log_level) == (DB, 8080, "DEBUG")


def test_database_url_required():
    """Немає DATABASE_URL — ConfigError з проблемою, що починається з DATABASE_URL."""
    assert problem_names(DATABASE_URL=None) == ["DATABASE_URL"]


def test_blank_database_url():
    """Самі пробіли — теж «немає»."""
    assert problem_names(DATABASE_URL="   ") == ["DATABASE_URL"]


@pytest.mark.parametrize("value", ["0", "65536", "-1", "80a", "8.5", "eighty"])
def test_bad_port(value):
    """Порт — ціле від 1 до 65535."""
    assert problem_names(PORT=value) == ["PORT"]


@pytest.mark.parametrize("value, expected", [("1", 1), ("65535", 65535), ("", 8000)])
def test_port_bounds(value, expected):
    """1 і 65535 — коректні межі; порожній рядок — 8000."""
    assert load_config(env(PORT=value)).port == expected


@pytest.mark.parametrize("value", ["1", "true", "TRUE", "yes", "On", " true "])
def test_debug_true_words(value):
    """Слова «так» у будь-якому регістрі."""
    assert load_config(env(DEBUG=value)).debug is True


@pytest.mark.parametrize("value", ["0", "false", "False", "no", "OFF", ""])
def test_debug_false_words(value):
    """bool("false") — True! Тому «ні» перевіряють за списком слів."""
    assert load_config(env(DEBUG=value)).debug is False


@pytest.mark.parametrize("value", ["2", "enabled", "y"])
def test_debug_unknown_word(value):
    """Невідоме слово — помилка, а не мовчазне False."""
    assert problem_names(DEBUG=value) == ["DEBUG"]


def test_hosts_split_and_cleaned():
    """Пробіли й порожні елементи прибрано, порядок збережено."""
    config = load_config(env(ALLOWED_HOSTS=" shop.example.com, ,api.example.com,"))
    assert config.allowed_hosts == ("shop.example.com", "api.example.com")


@pytest.mark.parametrize("value", [None, "", " , "])
def test_hosts_required_without_debug(value):
    """Без DEBUG хоча б один хост обов'язковий."""
    assert problem_names(ALLOWED_HOSTS=value) == ["ALLOWED_HOSTS"]


def test_hosts_optional_in_debug():
    """У режимі DEBUG список може бути порожнім."""
    assert load_config(env(ALLOWED_HOSTS=None, DEBUG="1")).allowed_hosts == ()


def test_bad_log_level():
    """Рівень логування — лише з чотирьох."""
    assert problem_names(LOG_LEVEL="verbose") == ["LOG_LEVEL"]


def test_all_problems_at_once_in_order():
    """Збери всі помилки й кинь один ConfigError — у порядку таблиці."""
    names = problem_names(DATABASE_URL=None, PORT="0", DEBUG="maybe", LOG_LEVEL="loud")
    assert names == ["DATABASE_URL", "PORT", "DEBUG", "LOG_LEVEL"]


def test_problems_are_readable_messages():
    """Повідомлення — речення, а не лише назва змінної; виняток показує їх у тексті."""
    with pytest.raises(ConfigError) as caught:
        load_config(env(PORT="0"))
    assert len(caught.value.problems[0]) > len("PORT")
    assert "PORT" in str(caught.value)
