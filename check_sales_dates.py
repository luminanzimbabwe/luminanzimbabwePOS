        for sale in all_sales:
            cashier_name = sale.cashier.name if sale.cashier else 'None'
            print(f"Sale {sale.id}: {sale.created_at} (date: {sale.created_at.date()}) - {sale.payment_method} {sale.payment_currency} - Cashier: {cashier_name}")