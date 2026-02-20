import re

from slugify import slugify as _slugify


def slugify(text: str) -> str:
    return _slugify(text, lowercase=True)


def schema_name_from_slug(slug: str) -> str:
    """Converte slug do tenant em nome de schema PostgreSQL."""
    return f"tenant_{slug.replace('-', '_')}"


def validate_cnpj(cnpj: str) -> bool:
    """Valida CNPJ brasileiro."""
    cnpj = re.sub(r"\D", "", cnpj)
    if len(cnpj) != 14 or cnpj == cnpj[0] * 14:
        return False

    def calc_digit(cnpj_partial: str, weights: list[int]) -> int:
        total = sum(int(d) * w for d, w in zip(cnpj_partial, weights))
        remainder = total % 11
        return 0 if remainder < 2 else 11 - remainder

    w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]

    d1 = calc_digit(cnpj[:12], w1)
    d2 = calc_digit(cnpj[:12] + str(d1), w2)

    return cnpj[-2:] == f"{d1}{d2}"


def validate_cpf(cpf: str) -> bool:
    """Valida CPF brasileiro."""
    cpf = re.sub(r"\D", "", cpf)
    if len(cpf) != 11 or cpf == cpf[0] * 11:
        return False

    def calc_digit(cpf_partial: str, factor: int) -> int:
        total = sum(int(d) * f for d, f in zip(cpf_partial, range(factor, 1, -1)))
        remainder = (total * 10) % 11
        return 0 if remainder >= 10 else remainder

    d1 = calc_digit(cpf[:9], 10)
    d2 = calc_digit(cpf[:9] + str(d1), 11)

    return cpf[-2:] == f"{d1}{d2}"


def format_cnpj(cnpj: str) -> str:
    cnpj = re.sub(r"\D", "", cnpj)
    return f"{cnpj[:2]}.{cnpj[2:5]}.{cnpj[5:8]}/{cnpj[8:12]}-{cnpj[12:]}"


def format_cpf(cpf: str) -> str:
    cpf = re.sub(r"\D", "", cpf)
    return f"{cpf[:3]}.{cpf[3:6]}.{cpf[6:9]}-{cpf[9:]}"
