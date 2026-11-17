def charge_all(payments, charge, logger):
    charged = []
    for payment in payments:
        try:
            charge(payment)
        except Exception:
            logger.exception("payment %s failed", payment["id"])
        else:
            logger.info("payment %s charged", payment["id"])
            charged.append(payment["id"])
    return charged
