#!/usr/bin/env python
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'luminan_backend.settings')
django.setup()

from core.models import Product, ShopConfiguration

def populate_bakery_products():
    try:
        shop = ShopConfiguration.objects.get()
    except ShopConfiguration.DoesNotExist:
        print("No shop configured. Please register a shop first.")
        return

    bakery_products = [
        {
            'name': 'White Bread Loaf',
            'description': 'Fresh baked white bread loaf, perfect for sandwiches',
            'price': 2.50,
            'category': 'Bakery',
            'line_code': 'BAK001',
            'stock_quantity': 50,
            'min_stock_level': 10
        },
        {
            'name': 'Whole Wheat Bread',
            'description': 'Healthy whole wheat bread with grains',
            'price': 3.00,
            'category': 'Bakery',
            'line_code': 'BAK002',
            'stock_quantity': 35,
            'min_stock_level': 8
        },
        {
            'name': 'Croissant',
            'description': 'Buttery, flaky French croissant',
            'price': 1.75,
            'category': 'Bakery',
            'line_code': 'BAK003',
            'stock_quantity': 25,
            'min_stock_level': 5
        },
        {
            'name': 'Chocolate Chip Cookies',
            'description': 'Soft and chewy cookies with chocolate chips',
            'price': 0.75,
            'category': 'Bakery',
            'line_code': 'BAK004',
            'stock_quantity': 100,
            'min_stock_level': 20
        },
        {
            'name': 'Blueberry Muffins',
            'description': 'Fresh blueberry muffins, 6 pack',
            'price': 4.50,
            'category': 'Bakery',
            'line_code': 'BAK005',
            'stock_quantity': 20,
            'min_stock_level': 5
        },
        {
            'name': 'Bagels',
            'description': 'Assorted bagels - plain, sesame, poppy seed',
            'price': 1.25,
            'category': 'Bakery',
            'line_code': 'BAK006',
            'stock_quantity': 40,
            'min_stock_level': 10
        },
        {
            'name': 'Danish Pastry',
            'description': 'Sweet Danish pastry with fruit filling',
            'price': 2.25,
            'category': 'Bakery',
            'line_code': 'BAK007',
            'stock_quantity': 15,
            'min_stock_level': 3
        },
        {
            'name': 'Sourdough Bread',
            'description': 'Artisan sourdough bread loaf',
            'price': 4.00,
            'category': 'Bakery',
            'line_code': 'BAK008',
            'stock_quantity': 12,
            'min_stock_level': 3
        },
        {
            'name': 'Cinnamon Rolls',
            'description': 'Fresh cinnamon rolls with icing, 4 pack',
            'price': 5.50,
            'category': 'Bakery',
            'line_code': 'BAK009',
            'stock_quantity': 18,
            'min_stock_level': 4
        },
        {
            'name': 'Baguette',
            'description': 'French baguette, perfect for sandwiches',
            'price': 2.00,
            'category': 'Bakery',
            'line_code': 'BAK010',
            'stock_quantity': 30,
            'min_stock_level': 6
        },
        {
            'name': 'Brownies',
            'description': 'Rich chocolate brownies, 6 pack',
            'price': 6.00,
            'category': 'Bakery',
            'line_code': 'BAK011',
            'stock_quantity': 22,
            'min_stock_level': 5
        },
        {
            'name': 'Pita Bread',
            'description': 'Soft pita bread, 6 pack',
            'price': 3.25,
            'category': 'Bakery',
            'line_code': 'BAK012',
            'stock_quantity': 28,
            'min_stock_level': 7
        },
        # More Bakery Items (Cakes, Pies, Donuts)
        {
            'name': 'Chocolate Fudge Cake',
            'description': 'A rich, decadent chocolate fudge cake slice.',
            'price': 4.50,
            'category': 'Bakery',
            'line_code': 'BAK013',
            'stock_quantity': 15,
            'min_stock_level': 4
        },
        {
            'name': 'Carrot Cake',
            'description': 'Moist carrot cake with cream cheese frosting.',
            'price': 4.25,
            'category': 'Bakery',
            'line_code': 'BAK014',
            'stock_quantity': 15,
            'min_stock_level': 4
        },
        {
            'name': 'Red Velvet Cupcakes (4 Pack)',
            'description': 'Classic red velvet cupcakes with a rich frosting.',
            'price': 6.50,
            'category': 'Bakery',
            'line_code': 'BAK015',
            'stock_quantity': 20,
            'min_stock_level': 5
        },
        {
            'name': 'Glazed Donuts (Dozen)',
            'description': 'A dozen classic glazed donuts, light and sweet.',
            'price': 9.00,
            'category': 'Bakery',
            'line_code': 'BAK016',
            'stock_quantity': 30,
            'min_stock_level': 8
        },
        {
            'name': 'Apple Pie',
            'description': 'A whole traditional apple pie with a flaky crust.',
            'price': 12.00,
            'category': 'Bakery',
            'line_code': 'BAK017',
            'stock_quantity': 10,
            'min_stock_level': 3
        },
        {
            'name': 'New York Cheesecake',
            'description': 'A slice of creamy New York style cheesecake.',
            'price': 5.00,
            'category': 'Bakery',
            'line_code': 'BAK018',
            'stock_quantity': 12,
            'min_stock_level': 3
        },
        # Zimbabwean Bakery Products
        {
            'name': 'Proton Superior White Bread',
            'description': 'Premium white bread loaf from Proton Bakers, a Zimbabwean favorite.',
            'price': 1.10,
            'category': 'Bakery',
            'line_code': 'ZIMBAK001',
            'stock_quantity': 150,
            'min_stock_level': 30
        },
        {
            'name': 'Bakers Inn Standard Loaf',
            'description': 'The classic white bread loaf from Bakers Inn.',
            'price': 1.00,
            'category': 'Bakery',
            'line_code': 'ZIMBAK002',
            'stock_quantity': 200,
            'min_stock_level': 40
        },
        {
            'name': 'Lobels Classic White Bread',
            'description': 'A popular and trusted white bread from Lobels.',
            'price': 1.00,
            'category': 'Bakery',
            'line_code': 'ZIMBAK003',
            'stock_quantity': 180,
            'min_stock_level': 35
        },
        {
            'name': 'Proton Whole Wheat Bread',
            'description': 'Healthy whole wheat option from Proton Bakers.',
            'price': 1.20,
            'category': 'Bakery',
            'line_code': 'ZIMBAK004',
            'stock_quantity': 80,
            'min_stock_level': 15
        },
        {
            'name': 'Bakers Inn Meat Pie',
            'description': 'A savory meat pie, a classic snack from Bakers Inn.',
            'price': 1.50,
            'category': 'Bakery',
            'line_code': 'ZIMBAK005',
            'stock_quantity': 100,
            'min_stock_level': 20
        },
        {
            'name': 'Cream Buns (4 Pack)',
            'description': 'Sweet cream-filled buns, a popular treat.',
            'price': 2.00,
            'category': 'Bakery',
            'line_code': 'ZIMBAK006',
            'stock_quantity': 70,
            'min_stock_level': 15
        },
        {
            'name': 'Scones (6 Pack)',
            'description': 'Plain scones, perfect with tea.',
            'price': 2.50,
            'category': 'Bakery',
            'line_code': 'ZIMBAK007',
            'stock_quantity': 60,
            'min_stock_level': 10
        },
        # Final additions for a complete bakery section
        {
            'name': 'Sausage Roll',
            'description': 'Savory sausage meat wrapped in flaky puff pastry.',
            'price': 2.75,
            'category': 'Bakery',
            'line_code': 'BAK019',
            'stock_quantity': 40,
            'min_stock_level': 10
        },
        {
            'name': 'Gluten-Free Bread Loaf',
            'description': 'A loaf of bread made without gluten, perfect for sensitive diets.',
            'price': 5.50,
            'category': 'Bakery',
            'line_code': 'BAK020',
            'stock_quantity': 15,
            'min_stock_level': 5
        },
        {
            'name': 'Chocolate Eclairs (2 Pack)',
            'description': 'Classic choux pastry filled with cream and topped with chocolate icing.',
            'price': 4.00,
            'category': 'Bakery',
            'line_code': 'BAK021',
            'stock_quantity': 20,
            'min_stock_level': 5
        },
        {
            'name': 'Lemon Tart Slice',
            'description': 'A zesty lemon tart with a sweet pastry crust.',
            'price': 3.75,
            'category': 'Bakery',
            'line_code': 'BAK022',
            'stock_quantity': 18,
            'min_stock_level': 4
        },
        # Top Selling Bakery Products (Stock set to 0)
        {
            'name': 'Chocolate Croissant',
            'description': 'Buttery croissant filled with rich chocolate.',
            'price': 2.25,
            'category': 'Bakery',
            'line_code': 'BAK023',
            'stock_quantity': 0,
            'min_stock_level': 5
        },
        {
            'name': 'Blueberry Scone',
            'description': 'Fresh baked scone with blueberries.',
            'price': 2.50,
            'category': 'Bakery',
            'line_code': 'BAK024',
            'stock_quantity': 0,
            'min_stock_level': 6
        },
        {
            'name': 'Pain au Chocolat',
            'description': 'French chocolate pastry, flaky and delicious.',
            'price': 2.00,
            'category': 'Bakery',
            'line_code': 'BAK025',
            'stock_quantity': 0,
            'min_stock_level': 4
        },
        {
            'name': 'Cinnamon Swirl Bread',
            'description': 'Sweet bread with cinnamon swirls.',
            'price': 4.50,
            'category': 'Bakery',
            'line_code': 'BAK026',
            'stock_quantity': 0,
            'min_stock_level': 3
        },
        {
            'name': 'Almond Croissant',
            'description': 'Croissant topped with almond paste and sliced almonds.',
            'price': 2.75,
            'category': 'Bakery',
            'line_code': 'BAK027',
            'stock_quantity': 0,
            'min_stock_level': 4
        },
        {
            'name': 'Raspberry Danish',
            'description': 'Flaky pastry filled with raspberry jam.',
            'price': 2.50,
            'category': 'Bakery',
            'line_code': 'BAK028',
            'stock_quantity': 0,
            'min_stock_level': 5
        },
        {
            'name': 'Focaccia Bread',
            'description': 'Italian flatbread with herbs and olive oil.',
            'price': 3.25,
            'category': 'Bakery',
            'line_code': 'BAK029',
            'stock_quantity': 0,
            'min_stock_level': 3
        },
        {
            'name': 'Pecan Pie Slice',
            'description': 'Sweet pie with pecan nuts and caramel.',
            'price': 4.00,
            'category': 'Bakery',
            'line_code': 'BAK030',
            'stock_quantity': 0,
            'min_stock_level': 4
        },
        {
            'name': 'Brioche Bun',
            'description': 'Soft, enriched bread roll.',
            'price': 1.50,
            'category': 'Bakery',
            'line_code': 'BAK031',
            'stock_quantity': 0,
            'min_stock_level': 8
        },
        {
            'name': 'Tiramisu Cup',
            'description': 'Italian dessert with coffee-soaked ladyfingers.',
            'price': 4.25,
            'category': 'Bakery',
            'line_code': 'BAK032',
            'stock_quantity': 0,
            'min_stock_level': 3
        },
    ]

    # Zimbabwean Beverages
    beverage_products = [
        # Mazoe Fruit Juices (Zimbabwean)
        {
            'name': 'Mazoe Orange Crush 2L',
            'description': 'Popular Zimbabwean orange juice drink, 2 liter bottle',
            'price': 2.50,
            'category': 'Beverages',
            'line_code': 'BEV001',
            'stock_quantity': 50,
            'min_stock_level': 10
        },
        {
            'name': 'Mazoe Pineapple 2L',
            'description': 'Sweet pineapple juice drink from Zimbabwe, 2 liter bottle',
            'price': 2.50,
            'category': 'Beverages',
            'line_code': 'BEV002',
            'stock_quantity': 45,
            'min_stock_level': 9
        },
        {
            'name': 'Mazoe Apple 2L',
            'description': 'Refreshing apple juice drink, Zimbabwean favorite, 2 liter bottle',
            'price': 2.50,
            'category': 'Beverages',
            'line_code': 'BEV003',
            'stock_quantity': 40,
            'min_stock_level': 8
        },
        {
            'name': 'Mazoe Orange 500ml',
            'description': 'Small bottle of Mazoe orange crush juice',
            'price': 1.25,
            'category': 'Beverages',
            'line_code': 'BEV004',
            'stock_quantity': 100,
            'min_stock_level': 20
        },
        {
            'name': 'Mazoe Mixed Fruit 2L',
            'description': 'Mixed fruit juice blend from Mazoe, 2 liter bottle',
            'price': 2.75,
            'category': 'Beverages',
            'line_code': 'BEV005',
            'stock_quantity': 35,
            'min_stock_level': 7
        },

        # Sparletta (Zimbabwean)
        {
            'name': 'Sparletta Creme Soda 2L',
            'description': 'Classic Zimbabwean creme soda, 2 liter bottle',
            'price': 2.00,
            'category': 'Beverages',
            'line_code': 'BEV006',
            'stock_quantity': 60,
            'min_stock_level': 12
        },
        {
            'name': 'Sparletta Iron Brew 2L',
            'description': 'Zimbabwean iron brew soda, unique flavor, 2 liter bottle',
            'price': 2.00,
            'category': 'Beverages',
            'line_code': 'BEV007',
            'stock_quantity': 55,
            'min_stock_level': 11
        },
        {
            'name': 'Sparletta Pineapple 2L',
            'description': 'Pineapple flavored soda from Sparletta, 2 liter bottle',
            'price': 2.00,
            'category': 'Beverages',
            'line_code': 'BEV008',
            'stock_quantity': 50,
            'min_stock_level': 10
        },
        {
            'name': 'Sparletta Grapetiser 2L',
            'description': 'Grape flavored soda, Zimbabwean classic, 2 liter bottle',
            'price': 2.00,
            'category': 'Beverages',
            'line_code': 'BEV009',
            'stock_quantity': 45,
            'min_stock_level': 9
        },
        {
            'name': 'Sparletta Appletiser 2L',
            'description': 'Apple flavored soda from Sparletta, 2 liter bottle',
            'price': 2.00,
            'category': 'Beverages',
            'line_code': 'BEV010',
            'stock_quantity': 40,
            'min_stock_level': 8
        },

        # Coca-Cola Products
        {
            'name': 'Coca-Cola 2L',
            'description': 'Classic Coca-Cola, 2 liter bottle',
            'price': 2.25,
            'category': 'Beverages',
            'line_code': 'BEV011',
            'stock_quantity': 80,
            'min_stock_level': 16
        },
        {
            'name': 'Coca-Cola 500ml',
            'description': 'Coca-Cola in 500ml bottle',
            'price': 1.50,
            'category': 'Beverages',
            'line_code': 'BEV012',
            'stock_quantity': 150,
            'min_stock_level': 30
        },
        {
            'name': 'Coca-Cola Zero 2L',
            'description': 'Zero sugar Coca-Cola, 2 liter bottle',
            'price': 2.25,
            'category': 'Beverages',
            'line_code': 'BEV013',
            'stock_quantity': 60,
            'min_stock_level': 12
        },
        {
            'name': 'Diet Coke 2L',
            'description': 'Diet Coca-Cola, 2 liter bottle',
            'price': 2.25,
            'category': 'Beverages',
            'line_code': 'BEV014',
            'stock_quantity': 50,
            'min_stock_level': 10
        },

        # Fanta Products
        {
            'name': 'Fanta Orange 2L',
            'description': 'Fanta orange soda, 2 liter bottle',
            'price': 2.25,
            'category': 'Beverages',
            'line_code': 'BEV015',
            'stock_quantity': 70,
            'min_stock_level': 14
        },
        {
            'name': 'Fanta Pineapple 2L',
            'description': 'Fanta pineapple soda, 2 liter bottle',
            'price': 2.25,
            'category': 'Beverages',
            'line_code': 'BEV016',
            'stock_quantity': 65,
            'min_stock_level': 13
        },
        {
            'name': 'Fanta Grape 2L',
            'description': 'Fanta grape soda, 2 liter bottle',
            'price': 2.25,
            'category': 'Beverages',
            'line_code': 'BEV017',
            'stock_quantity': 60,
            'min_stock_level': 12
        },
        {
            'name': 'Fanta Zero Orange 2L',
            'description': 'Zero sugar Fanta orange, 2 liter bottle',
            'price': 2.25,
            'category': 'Beverages',
            'line_code': 'BEV018',
            'stock_quantity': 45,
            'min_stock_level': 9
        },

        # Sprite Products
        {
            'name': 'Sprite 2L',
            'description': 'Sprite lemon-lime soda, 2 liter bottle',
            'price': 2.25,
            'category': 'Beverages',
            'line_code': 'BEV019',
            'stock_quantity': 75,
            'min_stock_level': 15
        },
        {
            'name': 'Sprite Zero 2L',
            'description': 'Zero sugar Sprite, 2 liter bottle',
            'price': 2.25,
            'category': 'Beverages',
            'line_code': 'BEV020',
            'stock_quantity': 50,
            'min_stock_level': 10
        },

        # Schweppes Products
        {
            'name': 'Schweppes Tonic Water 2L',
            'description': 'Premium tonic water, 2 liter bottle',
            'price': 2.75,
            'category': 'Beverages',
            'line_code': 'BEV021',
            'stock_quantity': 40,
            'min_stock_level': 8
        },
        {
            'name': 'Schweppes Bitter Lemon 2L',
            'description': 'Bitter lemon soda, 2 liter bottle',
            'price': 2.75,
            'category': 'Beverages',
            'line_code': 'BEV022',
            'stock_quantity': 35,
            'min_stock_level': 7
        },
        {
            'name': 'Schweppes Lemonade 2L',
            'description': 'Classic lemonade, 2 liter bottle',
            'price': 2.75,
            'category': 'Beverages',
            'line_code': 'BEV023',
            'stock_quantity': 30,
            'min_stock_level': 6
        },
        {
            'name': 'Schweppes Soda Water 2L',
            'description': 'Sparkling soda water, 2 liter bottle',
            'price': 2.00,
            'category': 'Beverages',
            'line_code': 'BEV024',
            'stock_quantity': 45,
            'min_stock_level': 9
        },

        # Energy Drinks
        {
            'name': 'Red Bull 250ml',
            'description': 'Red Bull energy drink, gives you wings',
            'price': 3.50,
            'category': 'Beverages',
            'line_code': 'BEV025',
            'stock_quantity': 100,
            'min_stock_level': 20
        },
        {
            'name': 'Red Bull Sugar Free 250ml',
            'description': 'Red Bull energy drink, zero sugar',
            'price': 3.50,
            'category': 'Beverages',
            'line_code': 'BEV026',
            'stock_quantity': 80,
            'min_stock_level': 16
        },
        {
            'name': 'Monster Energy 500ml',
            'description': 'Monster Energy drink, Unleash the Beast',
            'price': 4.00,
            'category': 'Beverages',
            'line_code': 'BEV027',
            'stock_quantity': 60,
            'min_stock_level': 12
        },

        # Tea and Coffee Drinks
        {
            'name': 'Lipton Ice Tea Lemon 500ml',
            'description': 'Lipton iced tea with lemon flavor',
            'price': 1.75,
            'category': 'Beverages',
            'line_code': 'BEV028',
            'stock_quantity': 90,
            'min_stock_level': 18
        },
        {
            'name': 'Lipton Ice Tea Peach 500ml',
            'description': 'Lipton iced tea with peach flavor',
            'price': 1.75,
            'category': 'Beverages',
            'line_code': 'BEV029',
            'stock_quantity': 85,
            'min_stock_level': 17
        },
        {
            'name': 'Nestea Lemon 500ml',
            'description': 'Nestea iced tea with lemon',
            'price': 1.50,
            'category': 'Beverages',
            'line_code': 'BEV030',
            'stock_quantity': 75,
            'min_stock_level': 15
        },

        # Milk and Malt Drinks
        {
            'name': 'Milo 400g Tin',
            'description': 'Nestle Milo chocolate malt drink powder',
            'price': 8.50,
            'category': 'Beverages',
            'line_code': 'BEV031',
            'stock_quantity': 40,
            'min_stock_level': 8
        },
        {
            'name': 'Ovaltine 400g',
            'description': 'Ovaltine malt drink powder',
            'price': 7.50,
            'category': 'Beverages',
            'line_code': 'BEV032',
            'stock_quantity': 35,
            'min_stock_level': 7
        },
        {
            'name': 'Bournvita 400g',
            'description': 'Bournvita chocolate malt drink',
            'price': 8.00,
            'category': 'Beverages',
            'line_code': 'BEV033',
            'stock_quantity': 30,
            'min_stock_level': 6
        },

        # Beers (Local Zimbabwean)
        {
            'name': 'Castle Lager 440ml',
            'description': 'Castle Lager beer, Zimbabwean brewed',
            'price': 2.00,
            'category': 'Beverages',
            'line_code': 'BEV034',
            'stock_quantity': 200,
            'min_stock_level': 40
        },
        {
            'name': 'Zambezi Lager 440ml',
            'description': 'Zambezi Lager, premium Zimbabwean beer',
            'price': 2.25,
            'category': 'Beverages',
            'line_code': 'BEV035',
            'stock_quantity': 180,
            'min_stock_level': 36
        },
        {
            'name': 'Lion Lager 440ml',
            'description': 'Lion Lager beer from Zimbabwe',
            'price': 2.00,
            'category': 'Beverages',
            'line_code': 'BEV036',
            'stock_quantity': 170,
            'min_stock_level': 34
        },
        {
            'name': 'Castle Milk Stout 440ml',
            'description': 'Castle Milk Stout, sweet dark beer',
            'price': 2.50,
            'category': 'Beverages',
            'line_code': 'BEV037',
            'stock_quantity': 120,
            'min_stock_level': 24
        },
        {
            'name': 'Guinness Foreign Extra Stout 440ml',
            'description': 'Guinness stout beer',
            'price': 3.00,
            'category': 'Beverages',
            'line_code': 'BEV038',
            'stock_quantity': 100,
            'min_stock_level': 20
        },
        {
            'name': 'Black Label 440ml',
            'description': 'Black Label beer',
            'price': 2.25,
            'category': 'Beverages',
            'line_code': 'BEV039',
            'stock_quantity': 150,
            'min_stock_level': 30
        },

        # Bottled Water
        {
            'name': 'Bonaqua Water 500ml',
            'description': 'Bonaqua purified water, 500ml bottle',
            'price': 0.75,
            'category': 'Beverages',
            'line_code': 'BEV040',
            'stock_quantity': 300,
            'min_stock_level': 60
        },
        {
            'name': 'Bonaqua Water 2L',
            'description': 'Bonaqua purified water, 2 liter bottle',
            'price': 1.50,
            'category': 'Beverages',
            'line_code': 'BEV041',
            'stock_quantity': 150,
            'min_stock_level': 30
        },
        {
            'name': 'Nestle Pure Life 500ml',
            'description': 'Nestle Pure Life water, 500ml bottle',
            'price': 0.80,
            'category': 'Beverages',
            'line_code': 'BEV042',
            'stock_quantity': 250,
            'min_stock_level': 50
        },
        {
            'name': 'Volvic Water 500ml',
            'description': 'Volvic natural mineral water, 500ml',
            'price': 1.25,
            'category': 'Beverages',
            'line_code': 'BEV043',
            'stock_quantity': 120,
            'min_stock_level': 24
        },
        {
            'name': 'Evian Water 500ml',
            'description': 'Evian natural mineral water, 500ml',
            'price': 1.50,
            'category': 'Beverages',
            'line_code': 'BEV044',
            'stock_quantity': 100,
            'min_stock_level': 20
        },

        # International Sodas
        {
            'name': 'Pepsi 2L',
            'description': 'Pepsi cola, 2 liter bottle',
            'price': 2.25,
            'category': 'Beverages',
            'line_code': 'BEV045',
            'stock_quantity': 70,
            'min_stock_level': 14
        },
        {
            'name': 'Pepsi Max 2L',
            'description': 'Pepsi Max zero sugar, 2 liter bottle',
            'price': 2.25,
            'category': 'Beverages',
            'line_code': 'BEV046',
            'stock_quantity': 50,
            'min_stock_level': 10
        },
        {
            'name': '7-Up 2L',
            'description': '7-Up lemon-lime soda, 2 liter bottle',
            'price': 2.25,
            'category': 'Beverages',
            'line_code': 'BEV047',
            'stock_quantity': 60,
            'min_stock_level': 12
        },
        {
            'name': 'Dr Pepper 2L',
            'description': 'Dr Pepper soda, 2 liter bottle',
            'price': 2.50,
            'category': 'Beverages',
            'line_code': 'BEV048',
            'stock_quantity': 40,
            'min_stock_level': 8
        },
        {
            'name': 'Mountain Dew 2L',
            'description': 'Mountain Dew citrus soda, 2 liter bottle',
            'price': 2.50,
            'category': 'Beverages',
            'line_code': 'BEV049',
            'stock_quantity': 45,
            'min_stock_level': 9
        },

        # Sports Drinks
        {
            'name': 'Powerade Mountain Blast 500ml',
            'description': 'Powerade sports drink, Mountain Blast flavor',
            'price': 2.00,
            'category': 'Beverages',
            'line_code': 'BEV050',
            'stock_quantity': 80,
            'min_stock_level': 16
        },
        {
            'name': 'Powerade Berry Ice 500ml',
            'description': 'Powerade sports drink, Berry Ice flavor',
            'price': 2.00,
            'category': 'Beverages',
            'line_code': 'BEV051',
            'stock_quantity': 75,
            'min_stock_level': 15
        },
        {
            'name': 'Gatorade Lemon Lime 500ml',
            'description': 'Gatorade sports drink, Lemon Lime',
            'price': 2.25,
            'category': 'Beverages',
            'line_code': 'BEV052',
            'stock_quantity': 70,
            'min_stock_level': 14
        },
        {
            'name': 'Lucozade Energy 380ml',
            'description': 'Lucozade energy drink, orange flavor',
            'price': 2.50,
            'category': 'Beverages',
            'line_code': 'BEV053',
            'stock_quantity': 60,
            'min_stock_level': 12
        },

        # Fruit Juices (International)
        {
            'name': 'Tropicana Orange Juice 1L',
            'description': 'Tropicana pure orange juice, 1 liter',
            'price': 4.50,
            'category': 'Beverages',
            'line_code': 'BEV054',
            'stock_quantity': 40,
            'min_stock_level': 8
        },
        {
            'name': 'Minute Maid Apple Juice 1L',
            'description': 'Minute Maid apple juice, 1 liter',
            'price': 4.00,
            'category': 'Beverages',
            'line_code': 'BEV055',
            'stock_quantity': 35,
            'min_stock_level': 7
        },
        {
            'name': 'Del Monte Pineapple Juice 1L',
            'description': 'Del Monte pineapple juice, 1 liter',
            'price': 4.25,
            'category': 'Beverages',
            'line_code': 'BEV056',
            'stock_quantity': 30,
            'min_stock_level': 6
        },

        # More Zimbabwean Specialties
        {
            'name': 'Stoney Ginger Beer 2L',
            'description': 'Stoney ginger beer, Zimbabwean classic',
            'price': 2.25,
            'category': 'Beverages',
            'line_code': 'BEV057',
            'stock_quantity': 55,
            'min_stock_level': 11
        },
        {
            'name': 'Bohemian Lager 440ml',
            'description': 'Bohemian beer from Zimbabwe',
            'price': 2.00,
            'category': 'Beverages',
            'line_code': 'BEV058',
            'stock_quantity': 140,
            'min_stock_level': 28
        },
        {
            'name': 'Golden Pilsner 440ml',
            'description': 'Golden Pilsner beer',
            'price': 2.25,
            'category': 'Beverages',
            'line_code': 'BEV059',
            'stock_quantity': 130,
            'min_stock_level': 26
        },
        {
            'name': 'Sparletta Lemonade 2L',
            'description': 'Sparletta lemonade, refreshing citrus drink',
            'price': 2.00,
            'category': 'Beverages',
            'line_code': 'BEV060',
            'stock_quantity': 50,
            'min_stock_level': 10
        },
        {
            'name': 'Aquarius Lemon 500ml',
            'description': 'Aquarius isotonic drink, lemon flavor',
            'price': 1.75,
            'category': 'Beverages',
            'line_code': 'BEV061',
            'stock_quantity': 65,
            'min_stock_level': 13
        },
        {
            'name': 'Tang Orange 400g',
            'description': 'Tang orange drink powder',
            'price': 6.50,
            'category': 'Beverages',
            'line_code': 'BEV062',
            'stock_quantity': 45,
            'min_stock_level': 9
        },
        {
            'name': 'Five Roses Tea 100 bags',
            'description': 'Five Roses tea bags, Zimbabwean tea',
            'price': 12.00,
            'category': 'Beverages',
            'line_code': 'BEV063',
            'stock_quantity': 30,
            'min_stock_level': 6
        },
        {
            'name': 'Lipton Yellow Label Tea 100 bags',
            'description': 'Lipton yellow label tea bags',
            'price': 15.00,
            'category': 'Beverages',
            'line_code': 'BEV064',
            'stock_quantity': 25,
            'min_stock_level': 5
        },
        {
            'name': 'Nescafe Classic 200g',
            'description': 'Nescafe instant coffee',
            'price': 18.00,
            'category': 'Beverages',
            'line_code': 'BEV065',
            'stock_quantity': 40,
            'min_stock_level': 8
        },
        {
            'name': 'Douwe Egberts Coffee 200g',
            'description': 'Douwe Egberts instant coffee',
            'price': 16.50,
            'category': 'Beverages',
            'line_code': 'BEV066',
            'stock_quantity': 35,
            'min_stock_level': 7
        },
    ]

    # Dried Foods and Grocery Products
    dried_foods = [
        # Cereals and Breakfast Foods
        {
            'name': 'Kellogg\'s Corn Flakes 500g',
            'description': 'Classic corn flakes cereal for breakfast',
            'price': 4.50,
            'category': 'Dried Foods',
            'line_code': 'DRY001',
            'stock_quantity': 60,
            'min_stock_level': 12
        },
        {
            'name': 'Weet-Bix 500g',
            'description': 'Whole wheat cereal biscuits',
            'price': 3.75,
            'category': 'Dried Foods',
            'line_code': 'DRY002',
            'stock_quantity': 45,
            'min_stock_level': 9
        },
        {
            'name': 'Oats 1kg',
            'description': 'Rolled oats for porridge and baking',
            'price': 2.25,
            'category': 'Dried Foods',
            'line_code': 'DRY003',
            'stock_quantity': 80,
            'min_stock_level': 16
        },
        {
            'name': 'Rice Krispies 500g',
            'description': 'Rice cereal for breakfast',
            'price': 4.25,
            'category': 'Dried Foods',
            'line_code': 'DRY004',
            'stock_quantity': 40,
            'min_stock_level': 8
        },
        {
            'name': 'ProNutro 500g',
            'description': 'Whole wheat cereal with maize',
            'price': 3.50,
            'category': 'Dried Foods',
            'line_code': 'DRY005',
            'stock_quantity': 55,
            'min_stock_level': 11
        },

        # Rice and Grains
        {
            'name': 'Long Grain Rice 2kg',
            'description': 'Premium long grain white rice',
            'price': 3.75,
            'category': 'Dried Foods',
            'line_code': 'DRY006',
            'stock_quantity': 100,
            'min_stock_level': 20
        },
        {
            'name': 'Brown Rice 1kg',
            'description': 'Healthy brown rice',
            'price': 4.50,
            'category': 'Dried Foods',
            'line_code': 'DRY007',
            'stock_quantity': 60,
            'min_stock_level': 12
        },
        {
            'name': 'Maize Meal 2kg',
            'description': 'Finely ground maize meal for sadza',
            'price': 1.50,
            'category': 'Dried Foods',
            'line_code': 'DRY008',
            'stock_quantity': 150,
            'min_stock_level': 30
        },
        {
            'name': 'Sorghum 1kg',
            'description': 'Traditional African grain',
            'price': 2.00,
            'category': 'Dried Foods',
            'line_code': 'DRY009',
            'stock_quantity': 70,
            'min_stock_level': 14
        },
        {
            'name': 'Pearl Millet 1kg',
            'description': 'Nutritious pearl millet grain',
            'price': 2.25,
            'category': 'Dried Foods',
            'line_code': 'DRY010',
            'stock_quantity': 50,
            'min_stock_level': 10
        },

        # Pasta and Noodles
        {
            'name': 'Spaghetti 500g',
            'description': 'Classic spaghetti pasta',
            'price': 1.75,
            'category': 'Dried Foods',
            'line_code': 'DRY011',
            'stock_quantity': 90,
            'min_stock_level': 18
        },
        {
            'name': 'Macaroni 500g',
            'description': 'Elbow macaroni pasta',
            'price': 1.50,
            'category': 'Dried Foods',
            'line_code': 'DRY012',
            'stock_quantity': 85,
            'min_stock_level': 17
        },
        {
            'name': 'Penne Pasta 500g',
            'description': 'Tube-shaped pasta',
            'price': 2.00,
            'category': 'Dried Foods',
            'line_code': 'DRY013',
            'stock_quantity': 70,
            'min_stock_level': 14
        },
        {
            'name': 'Instant Noodles 85g (Pack of 6)',
            'description': 'Instant noodles with seasoning',
            'price': 3.50,
            'category': 'Dried Foods',
            'line_code': 'DRY014',
            'stock_quantity': 120,
            'min_stock_level': 24
        },
        {
            'name': 'Fusilli Pasta 500g',
            'description': 'Spiral-shaped pasta',
            'price': 2.25,
            'category': 'Dried Foods',
            'line_code': 'DRY015',
            'stock_quantity': 65,
            'min_stock_level': 13
        },

        # Flour and Baking Ingredients
        {
            'name': 'Cake Flour 1kg',
            'description': 'Fine flour for cakes and pastries',
            'price': 2.50,
            'category': 'Dried Foods',
            'line_code': 'DRY016',
            'stock_quantity': 75,
            'min_stock_level': 15
        },
        {
            'name': 'Bread Flour 1kg',
            'description': 'High-protein flour for bread making',
            'price': 2.75,
            'category': 'Dried Foods',
            'line_code': 'DRY017',
            'stock_quantity': 60,
            'min_stock_level': 12
        },
        {
            'name': 'Self-Raising Flour 1kg',
            'description': 'Flour with baking powder included',
            'price': 2.25,
            'category': 'Dried Foods',
            'line_code': 'DRY018',
            'stock_quantity': 80,
            'min_stock_level': 16
        },
        {
            'name': 'Maize Flour 1kg',
            'description': 'Ground maize flour',
            'price': 1.25,
            'category': 'Dried Foods',
            'line_code': 'DRY019',
            'stock_quantity': 100,
            'min_stock_level': 20
        },
        {
            'name': 'Baking Powder 100g',
            'description': 'Leavening agent for baking',
            'price': 1.50,
            'category': 'Dried Foods',
            'line_code': 'DRY020',
            'stock_quantity': 120,
            'min_stock_level': 24
        },

        # Sugar and Sweeteners
        {
            'name': 'White Sugar 1kg',
            'description': 'Refined white sugar',
            'price': 1.75,
            'category': 'Dried Foods',
            'line_code': 'DRY021',
            'stock_quantity': 200,
            'min_stock_level': 40
        },
        {
            'name': 'Brown Sugar 500g',
            'description': 'Soft brown sugar',
            'price': 2.00,
            'category': 'Dried Foods',
            'line_code': 'DRY022',
            'stock_quantity': 80,
            'min_stock_level': 16
        },
        {
            'name': 'Icing Sugar 500g',
            'description': 'Powdered sugar for icing',
            'price': 2.25,
            'category': 'Dried Foods',
            'line_code': 'DRY023',
            'stock_quantity': 60,
            'min_stock_level': 12
        },
        {
            'name': 'Honey 500g',
            'description': 'Pure honey from local beekeepers',
            'price': 8.50,
            'category': 'Dried Foods',
            'line_code': 'DRY024',
            'stock_quantity': 40,
            'min_stock_level': 8
        },

        # Cooking Oils and Fats
        {
            'name': 'Sunflower Oil 1L',
            'description': 'Refined sunflower cooking oil',
            'price': 4.50,
            'category': 'Dried Foods',
            'line_code': 'DRY025',
            'stock_quantity': 90,
            'min_stock_level': 18
        },
        {
            'name': 'Olive Oil 500ml',
            'description': 'Extra virgin olive oil',
            'price': 12.00,
            'category': 'Dried Foods',
            'line_code': 'DRY026',
            'stock_quantity': 30,
            'min_stock_level': 6
        },
        {
            'name': 'Vegetable Oil 2L',
            'description': 'Multi-purpose vegetable cooking oil',
            'price': 6.50,
            'category': 'Dried Foods',
            'line_code': 'DRY027',
            'stock_quantity': 70,
            'min_stock_level': 14
        },
        {
            'name': 'Coconut Oil 500ml',
            'description': 'Virgin coconut oil',
            'price': 9.50,
            'category': 'Dried Foods',
            'line_code': 'DRY028',
            'stock_quantity': 25,
            'min_stock_level': 5
        },
        {
            'name': 'Margarine 500g',
            'description': 'Vegetable margarine spread',
            'price': 3.25,
            'category': 'Dried Foods',
            'line_code': 'DRY029',
            'stock_quantity': 85,
            'min_stock_level': 17
        },

        # Canned Foods
        {
            'name': 'Baked Beans 410g',
            'description': 'Canned baked beans in tomato sauce',
            'price': 2.75,
            'category': 'Dried Foods',
            'line_code': 'DRY030',
            'stock_quantity': 100,
            'min_stock_level': 20
        },
        {
            'name': 'Tuna Chunks 170g',
            'description': 'Canned tuna chunks in oil',
            'price': 5.50,
            'category': 'Dried Foods',
            'line_code': 'DRY031',
            'stock_quantity': 60,
            'min_stock_level': 12
        },
        {
            'name': 'Corned Beef 340g',
            'description': 'Canned corned beef',
            'price': 7.50,
            'category': 'Dried Foods',
            'line_code': 'DRY032',
            'stock_quantity': 45,
            'min_stock_level': 9
        },
        {
            'name': 'Peaches 410g',
            'description': 'Canned peach halves in syrup',
            'price': 4.25,
            'category': 'Dried Foods',
            'line_code': 'DRY033',
            'stock_quantity': 55,
            'min_stock_level': 11
        },
        {
            'name': 'Pineapple 560g',
            'description': 'Canned pineapple chunks',
            'price': 4.75,
            'category': 'Dried Foods',
            'line_code': 'DRY034',
            'stock_quantity': 50,
            'min_stock_level': 10
        },

        # Snacks and Biscuits
        {
            'name': 'Digestive Biscuits 200g',
            'description': 'Whole wheat digestive biscuits',
            'price': 2.50,
            'category': 'Dried Foods',
            'line_code': 'DRY035',
            'stock_quantity': 120,
            'min_stock_level': 24
        },
        {
            'name': 'Marie Biscuits 200g',
            'description': 'Sweet Marie biscuits',
            'price': 2.25,
            'category': 'Dried Foods',
            'line_code': 'DRY036',
            'stock_quantity': 110,
            'min_stock_level': 22
        },
        {
            'name': 'Cream Crackers 200g',
            'description': 'Savory cream crackers',
            'price': 2.75,
            'category': 'Dried Foods',
            'line_code': 'DRY037',
            'stock_quantity': 95,
            'min_stock_level': 19
        },
        {
            'name': 'Potato Chips 150g',
            'description': 'Crispy potato chips',
            'price': 3.50,
            'category': 'Dried Foods',
            'line_code': 'DRY038',
            'stock_quantity': 150,
            'min_stock_level': 30
        },
        {
            'name': 'Popcorn 500g',
            'description': 'Microwave popcorn kernels',
            'price': 2.00,
            'category': 'Dried Foods',
            'line_code': 'DRY039',
            'stock_quantity': 80,
            'min_stock_level': 16
        },

        # Condiments and Sauces
        {
            'name': 'Tomato Sauce 700ml',
            'description': 'Rich tomato sauce',
            'price': 3.25,
            'category': 'Dried Foods',
            'line_code': 'DRY040',
            'stock_quantity': 75,
            'min_stock_level': 15
        },
        {
            'name': 'Chilli Sauce 350ml',
            'description': 'Hot chilli sauce',
            'price': 4.50,
            'category': 'Dried Foods',
            'line_code': 'DRY041',
            'stock_quantity': 60,
            'min_stock_level': 12
        },
        {
            'name': 'Soy Sauce 250ml',
            'description': 'Light soy sauce',
            'price': 3.75,
            'category': 'Dried Foods',
            'line_code': 'DRY042',
            'stock_quantity': 45,
            'min_stock_level': 9
        },
        {
            'name': 'Worcestershire Sauce 300ml',
            'description': 'Worcestershire sauce',
            'price': 5.25,
            'category': 'Dried Foods',
            'line_code': 'DRY043',
            'stock_quantity': 40,
            'min_stock_level': 8
        },
        {
            'name': 'Mayonnaise 500ml',
            'description': 'Creamy mayonnaise',
            'price': 6.50,
            'category': 'Dried Foods',
            'line_code': 'DRY044',
            'stock_quantity': 55,
            'min_stock_level': 11
        },

        # Spices and Seasonings
        {
            'name': 'Black Pepper 50g',
            'description': 'Ground black pepper',
            'price': 4.25,
            'category': 'Dried Foods',
            'line_code': 'DRY045',
            'stock_quantity': 90,
            'min_stock_level': 18
        },
        {
            'name': 'Cinnamon Sticks 50g',
            'description': 'Whole cinnamon sticks',
            'price': 3.75,
            'category': 'Dried Foods',
            'line_code': 'DRY046',
            'stock_quantity': 70,
            'min_stock_level': 14
        },
        {
            'name': 'Turmeric Powder 100g',
            'description': 'Ground turmeric spice',
            'price': 2.50,
            'category': 'Dried Foods',
            'line_code': 'DRY047',
            'stock_quantity': 85,
            'min_stock_level': 17
        },
        {
            'name': 'Cumin Seeds 100g',
            'description': 'Whole cumin seeds',
            'price': 3.25,
            'category': 'Dried Foods',
            'line_code': 'DRY048',
            'stock_quantity': 65,
            'min_stock_level': 13
        },
        {
            'name': 'Mixed Herbs 50g',
            'description': 'Dried mixed herbs',
            'price': 4.00,
            'category': 'Dried Foods',
            'line_code': 'DRY049',
            'stock_quantity': 80,
            'min_stock_level': 16
        },

        # Dried Fruits and Nuts
        {
            'name': 'Raisins 250g',
            'description': 'Dried grapes (raisins)',
            'price': 5.50,
            'category': 'Dried Foods',
            'line_code': 'DRY050',
            'stock_quantity': 60,
            'min_stock_level': 12
        },
        {
            'name': 'Almonds 200g',
            'description': 'Raw almonds',
            'price': 12.00,
            'category': 'Dried Foods',
            'line_code': 'DRY051',
            'stock_quantity': 35,
            'min_stock_level': 7
        },
        {
            'name': 'Peanuts 500g',
            'description': 'Roasted peanuts',
            'price': 3.75,
            'category': 'Dried Foods',
            'line_code': 'DRY052',
            'stock_quantity': 100,
            'min_stock_level': 20
        },
        {
            'name': 'Cashews 200g',
            'description': 'Premium cashew nuts',
            'price': 15.00,
            'category': 'Dried Foods',
            'line_code': 'DRY053',
            'stock_quantity': 30,
            'min_stock_level': 6
        },
        {
            'name': 'Dried Apricots 250g',
            'description': 'Sweet dried apricots',
            'price': 6.50,
            'category': 'Dried Foods',
            'line_code': 'DRY054',
            'stock_quantity': 45,
            'min_stock_level': 9
        },

        # Dairy and Milk Products
        {
            'name': 'Powdered Milk 400g',
            'description': 'Full cream powdered milk',
            'price': 8.50,
            'category': 'Dried Foods',
            'line_code': 'DRY055',
            'stock_quantity': 70,
            'min_stock_level': 14
        },
        {
            'name': 'Evaporated Milk 410g',
            'description': 'Canned evaporated milk',
            'price': 3.25,
            'category': 'Dried Foods',
            'line_code': 'DRY056',
            'stock_quantity': 85,
            'min_stock_level': 17
        },
        {
            'name': 'Condensed Milk 397g',
            'description': 'Sweetened condensed milk',
            'price': 4.75,
            'category': 'Dried Foods',
            'line_code': 'DRY057',
            'stock_quantity': 60,
            'min_stock_level': 12
        },

        # Soups and Instant Meals
        {
            'name': 'Chicken Noodle Soup 50g',
            'description': 'Instant chicken noodle soup mix',
            'price': 1.25,
            'category': 'Dried Foods',
            'line_code': 'DRY058',
            'stock_quantity': 150,
            'min_stock_level': 30
        },
        {
            'name': 'Cream of Mushroom Soup 50g',
            'description': 'Instant cream of mushroom soup',
            'price': 1.50,
            'category': 'Dried Foods',
            'line_code': 'DRY059',
            'stock_quantity': 120,
            'min_stock_level': 24
        },
        {
            'name': 'Tomato Soup 50g',
            'description': 'Instant tomato soup mix',
            'price': 1.25,
            'category': 'Dried Foods',
            'line_code': 'DRY060',
            'stock_quantity': 140,
            'min_stock_level': 28
        },

        # Zimbabwean Specialties
        {
            'name': 'Kapenta Fish 500g',
            'description': 'Dried kapenta (small fish) - Zimbabwean delicacy',
            'price': 12.00,
            'category': 'Dried Foods',
            'line_code': 'DRY061',
            'stock_quantity': 40,
            'min_stock_level': 8
        },
        {
            'name': 'Mopane Worms 250g',
            'description': 'Dried mopane worms - traditional Zimbabwean food',
            'price': 18.00,
            'category': 'Dried Foods',
            'line_code': 'DRY062',
            'stock_quantity': 25,
            'min_stock_level': 5
        },
        {
            'name': 'Groundnuts 1kg',
            'description': 'Raw groundnuts (peanuts)',
            'price': 4.50,
            'category': 'Dried Foods',
            'line_code': 'DRY063',
            'stock_quantity': 120,
            'min_stock_level': 24
        },
        {
            'name': 'Sugar Beans 1kg',
            'description': 'Dried sugar beans',
            'price': 3.25,
            'category': 'Dried Foods',
            'line_code': 'DRY064',
            'stock_quantity': 90,
            'min_stock_level': 18
        },
        {
            'name': 'Cowpeas 1kg',
            'description': 'Dried cowpeas (black-eyed peas)',
            'price': 3.00,
            'category': 'Dried Foods',
            'line_code': 'DRY065',
            'stock_quantity': 85,
            'min_stock_level': 17
        },

        # More International Products
        {
            'name': 'Lentils 500g',
            'description': 'Dried green lentils',
            'price': 2.75,
            'category': 'Dried Foods',
            'line_code': 'DRY066',
            'stock_quantity': 70,
            'min_stock_level': 14
        },
        {
            'name': 'Chickpeas 500g',
            'description': 'Dried chickpeas (garbanzo beans)',
            'price': 3.50,
            'category': 'Dried Foods',
            'line_code': 'DRY067',
            'stock_quantity': 65,
            'min_stock_level': 13
        },
        {
            'name': 'Kidney Beans 500g',
            'description': 'Dried red kidney beans',
            'price': 3.25,
            'category': 'Dried Foods',
            'line_code': 'DRY068',
            'stock_quantity': 75,
            'min_stock_level': 15
        },
        {
            'name': 'Split Peas 500g',
            'description': 'Yellow split peas',
            'price': 2.50,
            'category': 'Dried Foods',
            'line_code': 'DRY069',
            'stock_quantity': 60,
            'min_stock_level': 12
        },
        {
            'name': 'Quinoa 500g',
            'description': 'Organic quinoa grains',
            'price': 12.00,
            'category': 'Dried Foods',
            'line_code': 'DRY070',
            'stock_quantity': 30,
            'min_stock_level': 6
        },

        # More Snacks
        {
            'name': 'Pretzels 200g',
            'description': 'Salted pretzel sticks',
            'price': 3.75,
            'category': 'Dried Foods',
            'line_code': 'DRY071',
            'stock_quantity': 80,
            'min_stock_level': 16
        },
        {
            'name': 'Trail Mix 300g',
            'description': 'Mixed nuts and dried fruits',
            'price': 8.50,
            'category': 'Dried Foods',
            'line_code': 'DRY072',
            'stock_quantity': 45,
            'min_stock_level': 9
        },
        {
            'name': 'Rice Cakes 150g',
            'description': 'Plain rice cakes',
            'price': 4.25,
            'category': 'Dried Foods',
            'line_code': 'DRY073',
            'stock_quantity': 55,
            'min_stock_level': 11
        },
        {
            'name': 'Corn Chips 200g',
            'description': 'Crispy corn tortilla chips',
            'price': 4.00,
            'category': 'Dried Foods',
            'line_code': 'DRY074',
            'stock_quantity': 90,
            'min_stock_level': 18
        },
        {
            'name': 'Chocolate Biscuits 150g',
            'description': 'Chocolate coated biscuits',
            'price': 3.25,
            'category': 'Dried Foods',
            'line_code': 'DRY075',
            'stock_quantity': 100,
            'min_stock_level': 20
        },

        # Baking Essentials
        {
            'name': 'Vanilla Essence 50ml',
            'description': 'Pure vanilla extract for baking',
            'price': 6.50,
            'category': 'Dried Foods',
            'line_code': 'DRY076',
            'stock_quantity': 40,
            'min_stock_level': 8
        },
        {
            'name': 'Cocoa Powder 250g',
            'description': 'Pure cocoa powder for baking',
            'price': 7.50,
            'category': 'Dried Foods',
            'line_code': 'DRY077',
            'stock_quantity': 50,
            'min_stock_level': 10
        },
        {
            'name': 'Baking Soda 200g',
            'description': 'Sodium bicarbonate for baking',
            'price': 2.00,
            'category': 'Dried Foods',
            'line_code': 'DRY078',
            'stock_quantity': 110,
            'min_stock_level': 22
        },
        {
            'name': 'Yeast 100g',
            'description': 'Active dry yeast for bread making',
            'price': 3.75,
            'category': 'Dried Foods',
            'line_code': 'DRY079',
            'stock_quantity': 65,
            'min_stock_level': 13
        },
        {
            'name': 'Gelatin Powder 50g',
            'description': 'Unflavored gelatin powder',
            'price': 5.25,
            'category': 'Dried Foods',
            'line_code': 'DRY080',
            'stock_quantity': 35,
            'min_stock_level': 7
        },
    ]

    # Fresh Produce - Fruits
    fresh_fruits = [
        {
            'name': 'Bananas (1kg)',
            'description': 'Fresh bananas, locally sourced',
            'price': 1.50,
            'category': 'Fresh Produce',
            'line_code': 'FRU001',
            'stock_quantity': 200,
            'min_stock_level': 40
        },
        {
            'name': 'Apples (1kg)',
            'description': 'Fresh red apples',
            'price': 3.50,
            'category': 'Fresh Produce',
            'line_code': 'FRU002',
            'stock_quantity': 100,
            'min_stock_level': 20
        },
        {
            'name': 'Oranges (1kg)',
            'description': 'Fresh navel oranges',
            'price': 2.00,
            'category': 'Fresh Produce',
            'line_code': 'FRU003',
            'stock_quantity': 150,
            'min_stock_level': 30
        },
        {
            'name': 'Lemons (500g)',
            'description': 'Fresh lemons for cooking and drinks',
            'price': 1.25,
            'category': 'Fresh Produce',
            'line_code': 'FRU004',
            'stock_quantity': 120,
            'min_stock_level': 24
        },
        {
            'name': 'Pineapples (each)',
            'description': 'Fresh whole pineapples',
            'price': 2.50,
            'category': 'Fresh Produce',
            'line_code': 'FRU005',
            'stock_quantity': 80,
            'min_stock_level': 16
        },
        {
            'name': 'Mangoes (1kg)',
            'description': 'Fresh mangoes, seasonal',
            'price': 3.00,
            'category': 'Fresh Produce',
            'line_code': 'FRU006',
            'stock_quantity': 90,
            'min_stock_level': 18
        },
        {
            'name': 'Grapes (500g)',
            'description': 'Fresh grapes',
            'price': 4.00,
            'category': 'Fresh Produce',
            'line_code': 'FRU007',
            'stock_quantity': 60,
            'min_stock_level': 12
        },
        {
            'name': 'Pears (1kg)',
            'description': 'Fresh pears',
            'price': 3.25,
            'category': 'Fresh Produce',
            'line_code': 'FRU008',
            'stock_quantity': 70,
            'min_stock_level': 14
        },
        {
            'name': 'Avocados (each)',
            'description': 'Fresh avocados',
            'price': 1.75,
            'category': 'Fresh Produce',
            'line_code': 'FRU009',
            'stock_quantity': 100,
            'min_stock_level': 20
        },
        {
            'name': 'Guavas (1kg)',
            'description': 'Fresh local guavas',
            'price': 2.25,
            'category': 'Fresh Produce',
            'line_code': 'FRU010',
            'stock_quantity': 85,
            'min_stock_level': 17
        },
    ]

    # Fresh Produce - Vegetables
    fresh_vegetables = [
        {
            'name': 'Tomatoes (1kg)',
            'description': 'Fresh tomatoes',
            'price': 1.75,
            'category': 'Fresh Produce',
            'line_code': 'VEG001',
            'stock_quantity': 150,
            'min_stock_level': 30
        },
        {
            'name': 'Onions (1kg)',
            'description': 'Fresh onions',
            'price': 1.25,
            'category': 'Fresh Produce',
            'line_code': 'VEG002',
            'stock_quantity': 200,
            'min_stock_level': 40
        },
        {
            'name': 'Potatoes (2kg)',
            'description': 'Fresh potatoes',
            'price': 2.50,
            'category': 'Fresh Produce',
            'line_code': 'VEG003',
            'stock_quantity': 120,
            'min_stock_level': 24
        },
        {
            'name': 'Carrots (1kg)',
            'description': 'Fresh carrots',
            'price': 1.50,
            'category': 'Fresh Produce',
            'line_code': 'VEG004',
            'stock_quantity': 100,
            'min_stock_level': 20
        },
        {
            'name': 'Cabbage (each)',
            'description': 'Fresh green cabbage',
            'price': 1.00,
            'category': 'Fresh Produce',
            'line_code': 'VEG005',
            'stock_quantity': 80,
            'min_stock_level': 16
        },
        {
            'name': 'Spinach (500g)',
            'description': 'Fresh spinach leaves',
            'price': 1.25,
            'category': 'Fresh Produce',
            'line_code': 'VEG006',
            'stock_quantity': 90,
            'min_stock_level': 18
        },
        {
            'name': 'Green Peppers (500g)',
            'description': 'Fresh green bell peppers',
            'price': 2.00,
            'category': 'Fresh Produce',
            'line_code': 'VEG007',
            'stock_quantity': 70,
            'min_stock_level': 14
        },
        {
            'name': 'Eggplant (500g)',
            'description': 'Fresh eggplant (brinjal)',
            'price': 1.75,
            'category': 'Fresh Produce',
            'line_code': 'VEG008',
            'stock_quantity': 60,
            'min_stock_level': 12
        },
        {
            'name': 'Cucumber (each)',
            'description': 'Fresh cucumber',
            'price': 0.75,
            'category': 'Fresh Produce',
            'line_code': 'VEG009',
            'stock_quantity': 110,
            'min_stock_level': 22
        },
        {
            'name': 'Garlic (200g)',
            'description': 'Fresh garlic bulbs',
            'price': 2.50,
            'category': 'Fresh Produce',
            'line_code': 'VEG010',
            'stock_quantity': 80,
            'min_stock_level': 16
        },
    ]

    # Frozen Foods
    frozen_foods = [
        {
            'name': 'Frozen Mixed Vegetables 500g',
            'description': 'Frozen peas, carrots, corn, and beans mix',
            'price': 3.50,
            'category': 'Frozen Foods',
            'line_code': 'FRO001',
            'stock_quantity': 60,
            'min_stock_level': 12
        },
        {
            'name': 'Frozen Chicken Pieces 1kg',
            'description': 'Frozen chicken pieces for cooking',
            'price': 8.50,
            'category': 'Frozen Foods',
            'line_code': 'FRO002',
            'stock_quantity': 40,
            'min_stock_level': 8
        },
        {
            'name': 'Frozen Fish Fillets 500g',
            'description': 'Frozen hake fish fillets',
            'price': 12.00,
            'category': 'Frozen Foods',
            'line_code': 'FRO003',
            'stock_quantity': 30,
            'min_stock_level': 6
        },
        {
            'name': 'Frozen Beef Burgers 400g (4 pack)',
            'description': 'Frozen beef burger patties',
            'price': 7.50,
            'category': 'Frozen Foods',
            'line_code': 'FRO004',
            'stock_quantity': 35,
            'min_stock_level': 7
        },
        {
            'name': 'Frozen French Fries 1kg',
            'description': 'Frozen potato fries',
            'price': 4.50,
            'category': 'Frozen Foods',
            'line_code': 'FRO005',
            'stock_quantity': 50,
            'min_stock_level': 10
        },
        {
            'name': 'Frozen Ice Cream 1L',
            'description': 'Vanilla ice cream',
            'price': 6.00,
            'category': 'Frozen Foods',
            'line_code': 'FRO006',
            'stock_quantity': 25,
            'min_stock_level': 5
        },
        {
            'name': 'Frozen Pizza 300g',
            'description': 'Frozen pepperoni pizza',
            'price': 8.00,
            'category': 'Frozen Foods',
            'line_code': 'FRO007',
            'stock_quantity': 30,
            'min_stock_level': 6
        },
        {
            'name': 'Frozen Spring Rolls 200g (10 pack)',
            'description': 'Frozen vegetable spring rolls',
            'price': 5.50,
            'category': 'Frozen Foods',
            'line_code': 'FRO008',
            'stock_quantity': 40,
            'min_stock_level': 8
        },
    ]

    # Dairy Products
    dairy_products = [
        {
            'name': 'Fresh Milk 2L',
            'description': 'Fresh full cream milk',
            'price': 2.75,
            'category': 'Dairy',
            'line_code': 'DAI001',
            'stock_quantity': 80,
            'min_stock_level': 16
        },
        {
            'name': 'Fresh Milk 500ml',
            'description': 'Fresh full cream milk',
            'price': 1.00,
            'category': 'Dairy',
            'line_code': 'DAI002',
            'stock_quantity': 150,
            'min_stock_level': 30
        },
        {
            'name': 'Low Fat Milk 2L',
            'description': 'Low fat milk',
            'price': 2.50,
            'category': 'Dairy',
            'line_code': 'DAI003',
            'stock_quantity': 60,
            'min_stock_level': 12
        },
        {
            'name': 'Cheddar Cheese 250g',
            'description': 'Mature cheddar cheese',
            'price': 6.50,
            'category': 'Dairy',
            'line_code': 'DAI004',
            'stock_quantity': 40,
            'min_stock_level': 8
        },
        {
            'name': 'Butter 250g',
            'description': 'Salted butter',
            'price': 4.25,
            'category': 'Dairy',
            'line_code': 'DAI005',
            'stock_quantity': 50,
            'min_stock_level': 10
        },
        {
            'name': 'Yogurt 1kg',
            'description': 'Plain yogurt',
            'price': 3.50,
            'category': 'Dairy',
            'line_code': 'DAI006',
            'stock_quantity': 45,
            'min_stock_level': 9
        },
        {
            'name': 'Flavored Yogurt 150g',
            'description': 'Strawberry yogurt',
            'price': 1.25,
            'category': 'Dairy',
            'line_code': 'DAI007',
            'stock_quantity': 120,
            'min_stock_level': 24
        },
        {
            'name': 'Cream 250ml',
            'description': 'Fresh cream',
            'price': 3.75,
            'category': 'Dairy',
            'line_code': 'DAI008',
            'stock_quantity': 35,
            'min_stock_level': 7
        },
    ]

    # Meat Products
    meat_products = [
        {
            'name': 'Chicken Breast 1kg',
            'description': 'Fresh chicken breast fillets',
            'price': 12.00,
            'category': 'Meat',
            'line_code': 'MEA001',
            'stock_quantity': 30,
            'min_stock_level': 6
        },
        {
            'name': 'Beef Steak 500g',
            'description': 'Beef sirloin steak',
            'price': 18.00,
            'category': 'Meat',
            'line_code': 'MEA002',
            'stock_quantity': 20,
            'min_stock_level': 4
        },
        {
            'name': 'Pork Chops 500g',
            'description': 'Pork loin chops',
            'price': 15.00,
            'category': 'Meat',
            'line_code': 'MEA003',
            'stock_quantity': 25,
            'min_stock_level': 5
        },
        {
            'name': 'Sausages 500g',
            'description': 'Beef sausages',
            'price': 8.50,
            'category': 'Meat',
            'line_code': 'MEA004',
            'stock_quantity': 40,
            'min_stock_level': 8
        },
        {
            'name': 'Bacon 250g',
            'description': 'Smoked bacon rashers',
            'price': 10.00,
            'category': 'Meat',
            'line_code': 'MEA005',
            'stock_quantity': 35,
            'min_stock_level': 7
        },
        {
            'name': 'Chicken Thighs 1kg',
            'description': 'Chicken thigh pieces with bone',
            'price': 9.50,
            'category': 'Meat',
            'line_code': 'MEA006',
            'stock_quantity': 35,
            'min_stock_level': 7
        },
        {
            'name': 'Ground Beef 500g',
            'description': 'Minced beef for cooking',
            'price': 11.00,
            'category': 'Meat',
            'line_code': 'MEA007',
            'stock_quantity': 45,
            'min_stock_level': 9
        },
        {
            'name': 'Lamb Chops 500g',
            'description': 'Lamb rib chops',
            'price': 22.00,
            'category': 'Meat',
            'line_code': 'MEA008',
            'stock_quantity': 15,
            'min_stock_level': 3
        },
    ]

    # Household Cleaning Products
    household_products = [
        {
            'name': 'Dishwashing Liquid 750ml',
            'description': 'Dish soap for washing dishes',
            'price': 3.50,
            'category': 'Household',
            'line_code': 'HOU001',
            'stock_quantity': 60,
            'min_stock_level': 12
        },
        {
            'name': 'Laundry Detergent 2kg',
            'description': 'Washing powder for clothes',
            'price': 8.50,
            'category': 'Household',
            'line_code': 'HOU002',
            'stock_quantity': 40,
            'min_stock_level': 8
        },
        {
            'name': 'Floor Cleaner 1L',
            'description': 'Multi-surface floor cleaner',
            'price': 4.25,
            'category': 'Household',
            'line_code': 'HOU003',
            'stock_quantity': 50,
            'min_stock_level': 10
        },
        {
            'name': 'Toilet Cleaner 750ml',
            'description': 'Toilet bowl cleaner',
            'price': 3.75,
            'category': 'Household',
            'line_code': 'HOU004',
            'stock_quantity': 45,
            'min_stock_level': 9
        },
        {
            'name': 'Glass Cleaner 500ml',
            'description': 'Streak-free glass and surface cleaner',
            'price': 3.00,
            'category': 'Household',
            'line_code': 'HOU005',
            'stock_quantity': 55,
            'min_stock_level': 11
        },
        {
            'name': 'Fabric Softener 1L',
            'description': 'Clothes softener',
            'price': 5.50,
            'category': 'Household',
            'line_code': 'HOU006',
            'stock_quantity': 35,
            'min_stock_level': 7
        },
        {
            'name': 'Bleach 1L',
            'description': 'Household bleach for cleaning',
            'price': 2.75,
            'category': 'Household',
            'line_code': 'HOU007',
            'stock_quantity': 40,
            'min_stock_level': 8
        },
        {
            'name': 'Air Freshener 300ml',
            'description': 'Room air freshener spray',
            'price': 4.00,
            'category': 'Household',
            'line_code': 'HOU008',
            'stock_quantity': 50,
            'min_stock_level': 10
        },
    ]

    # Personal Care Products
    personal_care = [
        {
            'name': 'Shampoo 400ml',
            'description': 'Hair shampoo for all hair types',
            'price': 6.50,
            'category': 'Personal Care',
            'line_code': 'PER001',
            'stock_quantity': 45,
            'min_stock_level': 9
        },
        {
            'name': 'Conditioner 400ml',
            'description': 'Hair conditioner',
            'price': 6.50,
            'category': 'Personal Care',
            'line_code': 'PER002',
            'stock_quantity': 40,
            'min_stock_level': 8
        },
        {
            'name': 'Toothpaste 150g',
            'description': 'Fluoride toothpaste',
            'price': 2.75,
            'category': 'Personal Care',
            'line_code': 'PER003',
            'stock_quantity': 80,
            'min_stock_level': 16
        },
        {
            'name': 'Toothbrush (pack of 2)',
            'description': 'Medium bristle toothbrushes',
            'price': 3.00,
            'category': 'Personal Care',
            'line_code': 'PER004',
            'stock_quantity': 60,
            'min_stock_level': 12
        },
        {
            'name': 'Body Wash 500ml',
            'description': 'Body shower gel',
            'price': 5.25,
            'category': 'Personal Care',
            'line_code': 'PER005',
            'stock_quantity': 50,
            'min_stock_level': 10
        },
        {
            'name': 'Deodorant 150ml',
            'description': 'Antiperspirant deodorant',
            'price': 4.50,
            'category': 'Personal Care',
            'line_code': 'PER006',
            'stock_quantity': 55,
            'min_stock_level': 11
        },
        {
            'name': 'Facial Cleanser 200ml',
            'description': 'Gentle facial cleanser',
            'price': 7.50,
            'category': 'Personal Care',
            'line_code': 'PER007',
            'stock_quantity': 35,
            'min_stock_level': 7
        },
        {
            'name': 'Moisturizing Cream 200ml',
            'description': 'Body moisturizer',
            'price': 8.00,
            'category': 'Personal Care',
            'line_code': 'PER008',
            'stock_quantity': 40,
            'min_stock_level': 8
        },
    ]

    # Baby Products
    baby_products = [
        {
            'name': 'Baby Formula 900g',
            'description': 'Infant milk formula',
            'price': 25.00,
            'category': 'Baby Products',
            'line_code': 'BAB001',
            'stock_quantity': 20,
            'min_stock_level': 4
        },
        {
            'name': 'Diapers Size 3 (24 pack)',
            'description': 'Disposable baby diapers',
            'price': 12.50,
            'category': 'Baby Products',
            'line_code': 'BAB002',
            'stock_quantity': 30,
            'min_stock_level': 6
        },
        {
            'name': 'Baby Wipes 80 pack',
            'description': 'Gentle baby cleansing wipes',
            'price': 4.75,
            'category': 'Baby Products',
            'line_code': 'BAB003',
            'stock_quantity': 50,
            'min_stock_level': 10
        },
        {
            'name': 'Baby Shampoo 300ml',
            'description': 'Tear-free baby shampoo',
            'price': 6.00,
            'category': 'Baby Products',
            'line_code': 'BAB004',
            'stock_quantity': 35,
            'min_stock_level': 7
        },
        {
            'name': 'Baby Lotion 200ml',
            'description': 'Gentle baby moisturizing lotion',
            'price': 7.25,
            'category': 'Baby Products',
            'line_code': 'BAB005',
            'stock_quantity': 40,
            'min_stock_level': 8
        },
        {
            'name': 'Baby Food 125g',
            'description': 'Fruit puree for babies',
            'price': 2.50,
            'category': 'Baby Products',
            'line_code': 'BAB006',
            'stock_quantity': 60,
            'min_stock_level': 12
        },
        {
            'name': 'Baby Powder 200g',
            'description': 'Talc-free baby powder',
            'price': 5.50,
            'category': 'Baby Products',
            'line_code': 'BAB007',
            'stock_quantity': 45,
            'min_stock_level': 9
        },
        {
            'name': 'Pacifiers (2 pack)',
            'description': 'Orthodontic baby pacifiers',
            'price': 3.75,
            'category': 'Baby Products',
            'line_code': 'BAB008',
            'stock_quantity': 55,
            'min_stock_level': 11
        },
    ]

    # Pet Food and Supplies
    pet_products = [
        {
            'name': 'Dog Food 10kg',
            'description': 'Complete dog food for adult dogs',
            'price': 45.00,
            'category': 'Pet Supplies',
            'line_code': 'PET001',
            'stock_quantity': 15,
            'min_stock_level': 3
        },
        {
            'name': 'Cat Food 2kg',
            'description': 'Complete cat food',
            'price': 18.00,
            'category': 'Pet Supplies',
            'line_code': 'PET002',
            'stock_quantity': 20,
            'min_stock_level': 4
        },
        {
            'name': 'Dog Biscuits 500g',
            'description': 'Dog treats and biscuits',
            'price': 8.50,
            'category': 'Pet Supplies',
            'line_code': 'PET003',
            'stock_quantity': 30,
            'min_stock_level': 6
        },
        {
            'name': 'Cat Litter 5kg',
            'description': 'Clumping cat litter',
            'price': 12.00,
            'category': 'Pet Supplies',
            'line_code': 'PET004',
            'stock_quantity': 25,
            'min_stock_level': 5
        },
        {
            'name': 'Dog Shampoo 250ml',
            'description': 'Gentle dog shampoo',
            'price': 6.50,
            'category': 'Pet Supplies',
            'line_code': 'PET005',
            'stock_quantity': 35,
            'min_stock_level': 7
        },
        {
            'name': 'Pet Bowl',
            'description': 'Plastic pet feeding bowl',
            'price': 4.25,
            'category': 'Pet Supplies',
            'line_code': 'PET006',
            'stock_quantity': 40,
            'min_stock_level': 8
        },
    ]

    # Stationery and Office Supplies
    stationery = [
        {
            'name': 'A4 Paper 500 sheets',
            'description': 'White A4 printing paper',
            'price': 8.50,
            'category': 'Stationery',
            'line_code': 'STA001',
            'stock_quantity': 30,
            'min_stock_level': 6
        },
        {
            'name': 'Ballpoint Pens (12 pack)',
            'description': 'Blue ballpoint pens',
            'price': 3.50,
            'category': 'Stationery',
            'line_code': 'STA002',
            'stock_quantity': 60,
            'min_stock_level': 12
        },
        {
            'name': 'Notebooks A4 (5 pack)',
            'description': 'Lined notebooks',
            'price': 12.00,
            'category': 'Stationery',
            'line_code': 'STA003',
            'stock_quantity': 25,
            'min_stock_level': 5
        },
        {
            'name': 'Pencils HB (12 pack)',
            'description': 'HB pencils with eraser',
            'price': 2.75,
            'category': 'Stationery',
            'line_code': 'STA004',
            'stock_quantity': 50,
            'min_stock_level': 10
        },
        {
            'name': 'Glue Stick 35g',
            'description': 'Washable glue stick',
            'price': 1.50,
            'category': 'Stationery',
            'line_code': 'STA005',
            'stock_quantity': 80,
            'min_stock_level': 16
        },
        {
            'name': 'Colored Pencils 12 pack',
            'description': 'Assorted colored pencils',
            'price': 6.50,
            'category': 'Stationery',
            'line_code': 'STA006',
            'stock_quantity': 35,
            'min_stock_level': 7
        },
        {
            'name': 'Ruler 30cm',
            'description': 'Plastic ruler',
            'price': 1.25,
            'category': 'Stationery',
            'line_code': 'STA007',
            'stock_quantity': 70,
            'min_stock_level': 14
        },
        {
            'name': 'Calculator',
            'description': 'Basic calculator',
            'price': 8.00,
            'category': 'Stationery',
            'line_code': 'STA008',
            'stock_quantity': 20,
            'min_stock_level': 4
        },
    ]

    # More Alcohol Products
    alcohol_products = [
        {
            'name': 'Johnnie Walker Red Label 750ml',
            'description': 'Scotch whisky',
            'price': 35.00,
            'category': 'Alcohol',
            'line_code': 'ALC001',
            'stock_quantity': 15,
            'min_stock_level': 3
        },
        {
            'name': 'Jameson Irish Whiskey 750ml',
            'description': 'Irish whiskey',
            'price': 32.00,
            'category': 'Alcohol',
            'line_code': 'ALC002',
            'stock_quantity': 12,
            'min_stock_level': 2
        },
        {
            'name': 'Gordon\'s Gin 750ml',
            'description': 'London dry gin',
            'price': 28.00,
            'category': 'Alcohol',
            'line_code': 'ALC003',
            'stock_quantity': 18,
            'min_stock_level': 4
        },
        {
            'name': 'Smirnoff Vodka 750ml',
            'description': 'Premium vodka',
            'price': 25.00,
            'category': 'Alcohol',
            'line_code': 'ALC004',
            'stock_quantity': 20,
            'min_stock_level': 4
        },
        {
            'name': 'Bailey\'s Irish Cream 750ml',
            'description': 'Irish cream liqueur',
            'price': 30.00,
            'category': 'Alcohol',
            'line_code': 'ALC005',
            'stock_quantity': 14,
            'min_stock_level': 3
        },
        {
            'name': 'Cape Velvet Cream 750ml',
            'description': 'South African cream liqueur',
            'price': 18.00,
            'category': 'Alcohol',
            'line_code': 'ALC006',
            'stock_quantity': 16,
            'min_stock_level': 3
        },
        {
            'name': 'Riccadonna Asti 750ml',
            'description': 'Italian sparkling wine',
            'price': 22.00,
            'category': 'Alcohol',
            'line_code': 'ALC007',
            'stock_quantity': 10,
            'min_stock_level': 2
        },
        {
            'name': 'Savanna Dry White Wine 750ml',
            'description': 'South African white wine',
            'price': 15.00,
            'category': 'Alcohol',
            'line_code': 'ALC008',
            'stock_quantity': 25,
            'min_stock_level': 5
        },
    ]

    # Tobacco Products
    tobacco_products = [
        {
            'name': 'Marlboro Red 20s',
            'description': 'Marlboro cigarettes',
            'price': 3.50,
            'category': 'Tobacco',
            'line_code': 'TOB001',
            'stock_quantity': 100,
            'min_stock_level': 20
        },
        {
            'name': 'Camel Blue 20s',
            'description': 'Camel cigarettes',
            'price': 3.25,
            'category': 'Tobacco',
            'line_code': 'TOB002',
            'stock_quantity': 90,
            'min_stock_level': 18
        },
        {
            'name': 'Rothmans Blue 20s',
            'description': 'Rothmans cigarettes',
            'price': 3.00,
            'category': 'Tobacco',
            'line_code': 'TOB003',
            'stock_quantity': 85,
            'min_stock_level': 17
        },
        {
            'name': 'Peter Stuyvesant 20s',
            'description': 'Peter Stuyvesant cigarettes',
            'price': 3.75,
            'category': 'Tobacco',
            'line_code': 'TOB004',
            'stock_quantity': 75,
            'min_stock_level': 15
        },
        {
            'name': 'Dunhill Fine Cut 30g',
            'description': 'Pipe tobacco',
            'price': 8.50,
            'category': 'Tobacco',
            'line_code': 'TOB005',
            'stock_quantity': 40,
            'min_stock_level': 8
        },
        {
            'name': 'Rolling Papers (50 leaves)',
            'description': 'Cigarette rolling papers',
            'price': 2.50,
            'category': 'Tobacco',
            'line_code': 'TOB006',
            'stock_quantity': 60,
            'min_stock_level': 12
        },
    ]

    # Hardware and Building Materials
    hardware_products = [
        # Hand Tools
        {
            'name': 'Hammer 16oz',
            'description': 'Claw hammer for general construction work',
            'price': 12.50,
            'category': 'Hardware',
            'line_code': 'HAR001',
            'stock_quantity': 25,
            'min_stock_level': 5
        },
        {
            'name': 'Screwdriver Set (6 piece)',
            'description': 'Assorted flat and Phillips head screwdrivers',
            'price': 15.00,
            'category': 'Hardware',
            'line_code': 'HAR002',
            'stock_quantity': 20,
            'min_stock_level': 4
        },
        {
            'name': 'Pliers 8 inch',
            'description': 'Combination pliers for gripping and cutting',
            'price': 8.50,
            'category': 'Hardware',
            'line_code': 'HAR003',
            'stock_quantity': 30,
            'min_stock_level': 6
        },
        {
            'name': 'Wire Cutters 7 inch',
            'description': 'Heavy duty wire cutting pliers',
            'price': 11.00,
            'category': 'Hardware',
            'line_code': 'HAR004',
            'stock_quantity': 25,
            'min_stock_level': 5
        },
        {
            'name': 'Adjustable Wrench 10 inch',
            'description': 'Crescent wrench for various bolt sizes',
            'price': 14.00,
            'category': 'Hardware',
            'line_code': 'HAR005',
            'stock_quantity': 20,
            'min_stock_level': 4
        },
        {
            'name': 'Tape Measure 5m',
            'description': 'Retractable measuring tape',
            'price': 6.50,
            'category': 'Hardware',
            'line_code': 'HAR006',
            'stock_quantity': 40,
            'min_stock_level': 8
        },
        {
            'name': 'Level 24 inch',
            'description': 'Spirit level for checking horizontal/vertical alignment',
            'price': 18.00,
            'category': 'Hardware',
            'line_code': 'HAR007',
            'stock_quantity': 15,
            'min_stock_level': 3
        },
        {
            'name': 'Utility Knife',
            'description': 'Retractable blade utility knife',
            'price': 4.50,
            'category': 'Hardware',
            'line_code': 'HAR008',
            'stock_quantity': 50,
            'min_stock_level': 10
        },

        # Power Tools
        {
            'name': 'Cordless Drill 18V',
            'description': 'Battery powered drill with charger',
            'price': 85.00,
            'category': 'Hardware',
            'line_code': 'HAR009',
            'stock_quantity': 8,
            'min_stock_level': 2
        },
        {
            'name': 'Circular Saw 7.25 inch',
            'description': 'Electric circular saw for cutting wood',
            'price': 65.00,
            'category': 'Hardware',
            'line_code': 'HAR010',
            'stock_quantity': 6,
            'min_stock_level': 1
        },
        {
            'name': 'Jigsaw 4.5 amp',
            'description': 'Electric jigsaw for curved cuts',
            'price': 45.00,
            'category': 'Hardware',
            'line_code': 'HAR011',
            'stock_quantity': 10,
            'min_stock_level': 2
        },
        {
            'name': 'Angle Grinder 4.5 inch',
            'description': 'Electric angle grinder for cutting and grinding',
            'price': 55.00,
            'category': 'Hardware',
            'line_code': 'HAR012',
            'stock_quantity': 12,
            'min_stock_level': 3
        },

        # Fasteners and Hardware
        {
            'name': 'Nails 2 inch (1kg)',
            'description': 'Assorted steel nails',
            'price': 3.50,
            'category': 'Hardware',
            'line_code': 'HAR013',
            'stock_quantity': 35,
            'min_stock_level': 7
        },
        {
            'name': 'Wood Screws 1.5 inch (100 pack)',
            'description': 'Phillips head wood screws',
            'price': 5.00,
            'category': 'Hardware',
            'line_code': 'HAR014',
            'stock_quantity': 40,
            'min_stock_level': 8
        },
        {
            'name': 'Drywall Screws 1.25 inch (200 pack)',
            'description': 'Fine thread drywall screws',
            'price': 7.50,
            'category': 'Hardware',
            'line_code': 'HAR015',
            'stock_quantity': 25,
            'min_stock_level': 5
        },
        {
            'name': 'Washers Assorted (100 pack)',
            'description': 'Flat washers in various sizes',
            'price': 3.00,
            'category': 'Hardware',
            'line_code': 'HAR016',
            'stock_quantity': 45,
            'min_stock_level': 9
        },
        {
            'name': 'Nuts and Bolts Set M8 (50 sets)',
            'description': 'M8 nuts and bolts with washers',
            'price': 12.00,
            'category': 'Hardware',
            'line_code': 'HAR017',
            'stock_quantity': 20,
            'min_stock_level': 4
        },

        # Electrical Supplies
        {
            'name': 'Extension Cord 10m',
            'description': 'Heavy duty extension cord with 3 sockets',
            'price': 18.00,
            'category': 'Hardware',
            'line_code': 'HAR018',
            'stock_quantity': 15,
            'min_stock_level': 3
        },
        {
            'name': 'Light Bulb LED 9W (4 pack)',
            'description': 'Energy efficient LED light bulbs',
            'price': 8.00,
            'category': 'Hardware',
            'line_code': 'HAR019',
            'stock_quantity': 30,
            'min_stock_level': 6
        },
        {
            'name': 'Electrical Tape 19mm x 10m',
            'description': 'Insulating electrical tape',
            'price': 2.50,
            'category': 'Hardware',
            'line_code': 'HAR020',
            'stock_quantity': 50,
            'min_stock_level': 10
        },
        {
            'name': 'Wire Strippers',
            'description': 'Automatic wire stripping tool',
            'price': 7.00,
            'category': 'Hardware',
            'line_code': 'HAR021',
            'stock_quantity': 25,
            'min_stock_level': 5
        },
        {
            'name': 'Multimeter Digital',
            'description': 'Digital multimeter for electrical testing',
            'price': 25.00,
            'category': 'Hardware',
            'line_code': 'HAR022',
            'stock_quantity': 10,
            'min_stock_level': 2
        },

        # Plumbing Supplies
        {
            'name': 'PVC Pipe 20mm x 3m',
            'description': 'PVC water pipe for plumbing',
            'price': 8.50,
            'category': 'Hardware',
            'line_code': 'HAR023',
            'stock_quantity': 20,
            'min_stock_level': 4
        },
        {
            'name': 'PVC Elbow 20mm (2 pack)',
            'description': '90 degree PVC pipe elbows',
            'price': 3.00,
            'category': 'Hardware',
            'line_code': 'HAR024',
            'stock_quantity': 35,
            'min_stock_level': 7
        },
        {
            'name': 'Pipe Wrench 14 inch',
            'description': 'Heavy duty pipe wrench',
            'price': 22.00,
            'category': 'Hardware',
            'line_code': 'HAR025',
            'stock_quantity': 12,
            'min_stock_level': 3
        },
        {
            'name': 'Plumbers Tape 50m',
            'description': 'Teflon tape for pipe threading',
            'price': 4.50,
            'category': 'Hardware',
            'line_code': 'HAR026',
            'stock_quantity': 40,
            'min_stock_level': 8
        },
        {
            'name': 'Drain Cleaner 500g',
            'description': 'Chemical drain cleaning powder',
            'price': 6.00,
            'category': 'Hardware',
            'line_code': 'HAR027',
            'stock_quantity': 30,
            'min_stock_level': 6
        },

        # Building Materials
        {
            'name': 'Cement 50kg',
            'description': 'Portland cement for construction',
            'price': 12.00,
            'category': 'Hardware',
            'line_code': 'HAR028',
            'stock_quantity': 50,
            'min_stock_level': 10
        },
        {
            'name': 'Sand 25kg',
            'description': 'Building sand for mortar and concrete',
            'price': 4.50,
            'category': 'Hardware',
            'line_code': 'HAR029',
            'stock_quantity': 40,
            'min_stock_level': 8
        },
        {
            'name': 'Bricks Common (1000 pieces)',
            'description': 'Red clay bricks for construction',
            'price': 350.00,
            'category': 'Hardware',
            'line_code': 'HAR030',
            'stock_quantity': 5,
            'min_stock_level': 1
        },
        {
            'name': 'Concrete Blocks 6 inch (50 pieces)',
            'description': 'Hollow concrete blocks',
            'price': 85.00,
            'category': 'Hardware',
            'line_code': 'HAR031',
            'stock_quantity': 8,
            'min_stock_level': 2
        },
        {
            'name': 'Roofing Nails 3 inch (1kg)',
            'description': 'Galvanized roofing nails',
            'price': 5.50,
            'category': 'Hardware',
            'line_code': 'HAR032',
            'stock_quantity': 25,
            'min_stock_level': 5
        },

        # Paints and Finishes
        {
            'name': 'Emulsion Paint 5L White',
            'description': 'Interior emulsion paint',
            'price': 35.00,
            'category': 'Hardware',
            'line_code': 'HAR033',
            'stock_quantity': 15,
            'min_stock_level': 3
        },
        {
            'name': 'Gloss Paint 1L White',
            'description': 'Oil-based gloss paint for woodwork',
            'price': 18.00,
            'category': 'Hardware',
            'line_code': 'HAR034',
            'stock_quantity': 20,
            'min_stock_level': 4
        },
        {
            'name': 'Paint Brush 2 inch',
            'description': 'Synthetic paint brush',
            'price': 4.00,
            'category': 'Hardware',
            'line_code': 'HAR035',
            'stock_quantity': 40,
            'min_stock_level': 8
        },
        {
            'name': 'Paint Roller 9 inch',
            'description': 'Paint roller with handle',
            'price': 8.50,
            'category': 'Hardware',
            'line_code': 'HAR036',
            'stock_quantity': 25,
            'min_stock_level': 5
        },
        {
            'name': 'Paint Thinner 1L',
            'description': 'Solvent for cleaning paint brushes',
            'price': 7.50,
            'category': 'Hardware',
            'line_code': 'HAR037',
            'stock_quantity': 30,
            'min_stock_level': 6
        },

        # Safety Equipment
        {
            'name': 'Safety Goggles',
            'description': 'Protective eyewear for work',
            'price': 5.00,
            'category': 'Hardware',
            'line_code': 'HAR038',
            'stock_quantity': 35,
            'min_stock_level': 7
        },
        {
            'name': 'Work Gloves Large',
            'description': 'Heavy duty work gloves',
            'price': 3.50,
            'category': 'Hardware',
            'line_code': 'HAR039',
            'stock_quantity': 50,
            'min_stock_level': 10
        },
        {
            'name': 'Dust Mask (3 pack)',
            'description': 'Disposable dust masks',
            'price': 4.50,
            'category': 'Hardware',
            'line_code': 'HAR040',
            'stock_quantity': 40,
            'min_stock_level': 8
        },
        {
            'name': 'Hard Hat',
            'description': 'Construction safety helmet',
            'price': 12.00,
            'category': 'Hardware',
            'line_code': 'HAR041',
            'stock_quantity': 20,
            'min_stock_level': 4
        },
        {
            'name': 'First Aid Kit',
            'description': 'Basic workplace first aid kit',
            'price': 25.00,
            'category': 'Hardware',
            'line_code': 'HAR042',
            'stock_quantity': 15,
            'min_stock_level': 3
        },

        # Gardening Tools
        {
            'name': 'Garden Fork',
            'description': 'Heavy duty garden fork for digging',
            'price': 16.00,
            'category': 'Hardware',
            'line_code': 'HAR043',
            'stock_quantity': 18,
            'min_stock_level': 4
        },
        {
            'name': 'Garden Rake',
            'description': 'Metal garden rake',
            'price': 12.00,
            'category': 'Hardware',
            'line_code': 'HAR044',
            'stock_quantity': 22,
            'min_stock_level': 5
        },
        {
            'name': 'Pruning Shears',
            'description': 'Bypass pruning shears for plants',
            'price': 9.50,
            'category': 'Hardware',
            'line_code': 'HAR045',
            'stock_quantity': 25,
            'min_stock_level': 5
        },
        {
            'name': 'Garden Hose 15m',
            'description': 'Flexible garden watering hose',
            'price': 22.00,
            'category': 'Hardware',
            'line_code': 'HAR046',
            'stock_quantity': 12,
            'min_stock_level': 3
        },
        {
            'name': 'Wheelbarrow',
            'description': 'Heavy duty wheelbarrow for gardening',
            'price': 85.00,
            'category': 'Hardware',
            'line_code': 'HAR047',
            'stock_quantity': 6,
            'min_stock_level': 1
        },

        # Locks and Security
        {
            'name': 'Padlock 50mm',
            'description': 'Brass padlock with 2 keys',
            'price': 8.00,
            'category': 'Hardware',
            'line_code': 'HAR048',
            'stock_quantity': 30,
            'min_stock_level': 6
        },
        {
            'name': 'Door Hinges 4 inch (2 pack)',
            'description': 'Brass butt hinges for doors',
            'price': 6.50,
            'category': 'Hardware',
            'line_code': 'HAR049',
            'stock_quantity': 35,
            'min_stock_level': 7
        },
        {
            'name': 'Door Knob Set',
            'description': 'Complete door knob and lock set',
            'price': 15.00,
            'category': 'Hardware',
            'line_code': 'HAR050',
            'stock_quantity': 20,
            'min_stock_level': 4
        },
        {
            'name': 'Window Lock',
            'description': 'Security lock for sliding windows',
            'price': 4.50,
            'category': 'Hardware',
            'line_code': 'HAR051',
            'stock_quantity': 40,
            'min_stock_level': 8
        },
        {
            'name': 'Chain Lock 1m',
            'description': 'Security chain for doors',
            'price': 12.00,
            'category': 'Hardware',
            'line_code': 'HAR052',
            'stock_quantity': 25,
            'min_stock_level': 5
        },

        # Adhesives and Sealants
        {
            'name': 'Super Glue 20g',
            'description': 'Cyanoacrylate instant adhesive',
            'price': 3.50,
            'category': 'Hardware',
            'line_code': 'HAR053',
            'stock_quantity': 60,
            'min_stock_level': 12
        },
        {
            'name': 'Silicone Sealant 280ml',
            'description': 'Clear silicone sealant for bathrooms',
            'price': 8.00,
            'category': 'Hardware',
            'line_code': 'HAR054',
            'stock_quantity': 30,
            'min_stock_level': 6
        },
        {
            'name': 'Wood Glue 500ml',
            'description': 'PVA wood adhesive',
            'price': 6.50,
            'category': 'Hardware',
            'line_code': 'HAR055',
            'stock_quantity': 35,
            'min_stock_level': 7
        },
        {
            'name': 'Epoxy Adhesive 24ml',
            'description': 'Two-part epoxy for strong bonds',
            'price': 12.00,
            'category': 'Hardware',
            'line_code': 'HAR056',
            'stock_quantity': 25,
            'min_stock_level': 5
        },
        {
            'name': 'Duct Tape 50m',
            'description': 'Heavy duty cloth duct tape',
            'price': 7.50,
            'category': 'Hardware',
            'line_code': 'HAR057',
            'stock_quantity': 40,
            'min_stock_level': 8
        },

        # Lighting and Electrical
        {
            'name': 'LED Floodlight 50W',
            'description': 'Outdoor LED floodlight with bracket',
            'price': 35.00,
            'category': 'Hardware',
            'line_code': 'HAR058',
            'stock_quantity': 15,
            'min_stock_level': 3
        },
        {
            'name': 'Ceiling Fan 48 inch',
            'description': 'Electric ceiling fan with light kit',
            'price': 120.00,
            'category': 'Hardware',
            'line_code': 'HAR059',
            'stock_quantity': 8,
            'min_stock_level': 2
        },
        {
            'name': 'Power Strip 6 socket',
            'description': 'Surge protected power extension strip',
            'price': 15.00,
            'category': 'Hardware',
            'line_code': 'HAR060',
            'stock_quantity': 25,
            'min_stock_level': 5
        },
        {
            'name': 'Battery AA (4 pack)',
            'description': 'Alkaline AA batteries',
            'price': 4.00,
            'category': 'Hardware',
            'line_code': 'HAR061',
            'stock_quantity': 50,
            'min_stock_level': 10
        },
        {
            'name': 'Torch LED',
            'description': 'Rechargeable LED flashlight',
            'price': 12.00,
            'category': 'Hardware',
            'line_code': 'HAR062',
            'stock_quantity': 30,
            'min_stock_level': 6
        },
    ]

    # Electronics and Gadgets
    electronics_products = [
        # Mobile Phones and Accessories
        {
            'name': 'Samsung Galaxy A14 128GB',
            'description': 'Android smartphone with 128GB storage',
            'price': 250.00,
            'category': 'Electronics',
            'line_code': 'ELE001',
            'stock_quantity': 5,
            'min_stock_level': 1
        },
        {
            'name': 'iPhone 13 128GB',
            'description': 'Apple iPhone 13 with 128GB storage',
            'price': 650.00,
            'category': 'Electronics',
            'line_code': 'ELE002',
            'stock_quantity': 3,
            'min_stock_level': 1
        },
        {
            'name': 'Huawei Y9a 128GB',
            'description': 'Huawei smartphone with 128GB storage',
            'price': 180.00,
            'category': 'Electronics',
            'line_code': 'ELE003',
            'stock_quantity': 8,
            'min_stock_level': 2
        },
        {
            'name': 'Phone Charger USB-C',
            'description': 'Fast charging USB-C phone charger',
            'price': 15.00,
            'category': 'Electronics',
            'line_code': 'ELE004',
            'stock_quantity': 25,
            'min_stock_level': 5
        },
        {
            'name': 'Wireless Earbuds',
            'description': 'Bluetooth wireless earbuds with charging case',
            'price': 35.00,
            'category': 'Electronics',
            'line_code': 'ELE005',
            'stock_quantity': 15,
            'min_stock_level': 3
        },
        {
            'name': 'Phone Case Silicone',
            'description': 'Protective silicone phone case',
            'price': 8.00,
            'category': 'Electronics',
            'line_code': 'ELE006',
            'stock_quantity': 50,
            'min_stock_level': 10
        },
        {
            'name': 'Screen Protector',
            'description': 'Tempered glass screen protector',
            'price': 12.00,
            'category': 'Electronics',
            'line_code': 'ELE007',
            'stock_quantity': 40,
            'min_stock_level': 8
        },
        {
            'name': 'Power Bank 10000mAh',
            'description': 'Portable power bank for charging devices',
            'price': 25.00,
            'category': 'Electronics',
            'line_code': 'ELE008',
            'stock_quantity': 20,
            'min_stock_level': 4
        },

        # Audio and Video
        {
            'name': 'Bluetooth Speaker',
            'description': 'Portable Bluetooth speaker with waterproof design',
            'price': 45.00,
            'category': 'Electronics',
            'line_code': 'ELE009',
            'stock_quantity': 12,
            'min_stock_level': 3
        },
        {
            'name': 'Headphones Wired',
            'description': 'Over-ear wired headphones',
            'price': 28.00,
            'category': 'Electronics',
            'line_code': 'ELE010',
            'stock_quantity': 18,
            'min_stock_level': 4
        },
        {
            'name': 'USB Flash Drive 32GB',
            'description': 'USB 2.0 flash drive 32GB',
            'price': 12.00,
            'category': 'Electronics',
            'line_code': 'ELE011',
            'stock_quantity': 30,
            'min_stock_level': 6
        },
        {
            'name': 'Memory Card 64GB',
            'description': 'MicroSD memory card 64GB',
            'price': 18.00,
            'category': 'Electronics',
            'line_code': 'ELE012',
            'stock_quantity': 25,
            'min_stock_level': 5
        },

        # Home Electronics
        {
            'name': 'LED TV 32 inch',
            'description': '32 inch LED television with HD display',
            'price': 280.00,
            'category': 'Electronics',
            'line_code': 'ELE013',
            'stock_quantity': 4,
            'min_stock_level': 1
        },
        {
            'name': 'DVD Player',
            'description': 'Multi-region DVD player',
            'price': 65.00,
            'category': 'Electronics',
            'line_code': 'ELE014',
            'stock_quantity': 6,
            'min_stock_level': 2
        },
        {
            'name': 'Electric Iron',
            'description': 'Steam electric iron for clothes',
            'price': 35.00,
            'category': 'Electronics',
            'line_code': 'ELE015',
            'stock_quantity': 10,
            'min_stock_level': 2
        },
        {
            'name': 'Electric Kettle 1.7L',
            'description': 'Electric kettle with auto shut-off',
            'price': 28.00,
            'category': 'Electronics',
            'line_code': 'ELE016',
            'stock_quantity': 15,
            'min_stock_level': 3
        },
    ]

    # Clothing and Fashion
    clothing_products = [
        {
            'name': 'Cotton T-Shirt',
            'description': 'Plain cotton t-shirt, various sizes',
            'price': 12.00,
            'category': 'Clothing',
            'line_code': 'CLO001',
            'stock_quantity': 50,
            'min_stock_level': 10
        },
        {
            'name': 'Jeans Medium',
            'description': 'Denim jeans, medium size',
            'price': 45.00,
            'category': 'Clothing',
            'line_code': 'CLO002',
            'stock_quantity': 20,
            'min_stock_level': 4
        },
        {
            'name': 'Winter Jacket',
            'description': 'Warm winter jacket',
            'price': 85.00,
            'category': 'Clothing',
            'line_code': 'CLO003',
            'stock_quantity': 15,
            'min_stock_level': 3
        },
        {
            'name': 'Running Shoes',
            'description': 'Athletic running shoes',
            'price': 65.00,
            'category': 'Clothing',
            'line_code': 'CLO004',
            'stock_quantity': 25,
            'min_stock_level': 5
        },
        {
            'name': 'Baseball Cap',
            'description': 'Adjustable baseball cap',
            'price': 8.00,
            'category': 'Clothing',
            'line_code': 'CLO005',
            'stock_quantity': 40,
            'min_stock_level': 8
        },
        {
            'name': 'Leather Belt',
            'description': 'Genuine leather belt',
            'price': 18.00,
            'category': 'Clothing',
            'line_code': 'CLO006',
            'stock_quantity': 30,
            'min_stock_level': 6
        },
        {
            'name': 'Sunglasses',
            'description': 'UV protection sunglasses',
            'price': 15.00,
            'category': 'Clothing',
            'line_code': 'CLO007',
            'stock_quantity': 35,
            'min_stock_level': 7
        },
        {
            'name': 'Wrist Watch',
            'description': 'Quartz analog wrist watch',
            'price': 35.00,
            'category': 'Clothing',
            'line_code': 'CLO008',
            'stock_quantity': 20,
            'min_stock_level': 4
        },
    ]

    # Home Appliances and Furniture
    home_appliances = [
        {
            'name': 'Refrigerator 150L',
            'description': 'Single door refrigerator',
            'price': 450.00,
            'category': 'Appliances',
            'line_code': 'APP001',
            'stock_quantity': 3,
            'min_stock_level': 1
        },
        {
            'name': 'Washing Machine 7kg',
            'description': 'Top load washing machine',
            'price': 380.00,
            'category': 'Appliances',
            'line_code': 'APP002',
            'stock_quantity': 2,
            'min_stock_level': 1
        },
        {
            'name': 'Microwave Oven 20L',
            'description': 'Digital microwave oven',
            'price': 120.00,
            'category': 'Appliances',
            'line_code': 'APP003',
            'stock_quantity': 5,
            'min_stock_level': 1
        },
        {
            'name': 'Blender 1.5L',
            'description': 'Electric blender with multiple speeds',
            'price': 45.00,
            'category': 'Appliances',
            'line_code': 'APP004',
            'stock_quantity': 8,
            'min_stock_level': 2
        },
        {
            'name': 'Coffee Maker',
            'description': 'Drip coffee maker 12 cup',
            'price': 55.00,
            'category': 'Appliances',
            'line_code': 'APP005',
            'stock_quantity': 6,
            'min_stock_level': 2
        },
        {
            'name': 'Toaster 2 Slice',
            'description': 'Electric toaster with adjustable settings',
            'price': 25.00,
            'category': 'Appliances',
            'line_code': 'APP006',
            'stock_quantity': 12,
            'min_stock_level': 3
        },
        {
            'name': 'Dining Chair',
            'description': 'Wooden dining chair',
            'price': 35.00,
            'category': 'Furniture',
            'line_code': 'FUR001',
            'stock_quantity': 15,
            'min_stock_level': 3
        },
        {
            'name': 'Coffee Table',
            'description': 'Wooden coffee table',
            'price': 85.00,
            'category': 'Furniture',
            'line_code': 'FUR002',
            'stock_quantity': 8,
            'min_stock_level': 2
        },
    ]

    # Health and Pharmacy Products
    health_products = [
        {
            'name': 'Paracetamol 500mg (20 tablets)',
            'description': 'Pain relief medication',
            'price': 3.50,
            'category': 'Health',
            'line_code': 'HEA001',
            'stock_quantity': 100,
            'min_stock_level': 20
        },
        {
            'name': 'Vitamin C 1000mg (30 tablets)',
            'description': 'Vitamin C supplement',
            'price': 8.00,
            'category': 'Health',
            'line_code': 'HEA002',
            'stock_quantity': 60,
            'min_stock_level': 12
        },
        {
            'name': 'Band-Aids Assorted (20 pack)',
            'description': 'Assorted size adhesive bandages',
            'price': 4.50,
            'category': 'Health',
            'line_code': 'HEA003',
            'stock_quantity': 80,
            'min_stock_level': 16
        },
        {
            'name': 'Thermometer Digital',
            'description': 'Digital body thermometer',
            'price': 12.00,
            'category': 'Health',
            'line_code': 'HEA004',
            'stock_quantity': 25,
            'min_stock_level': 5
        },
        {
            'name': 'Blood Pressure Monitor',
            'description': 'Digital blood pressure monitor',
            'price': 45.00,
            'category': 'Health',
            'line_code': 'HEA005',
            'stock_quantity': 10,
            'min_stock_level': 2
        },
        {
            'name': 'Face Masks (50 pack)',
            'description': 'Disposable face masks',
            'price': 8.00,
            'category': 'Health',
            'line_code': 'HEA006',
            'stock_quantity': 50,
            'min_stock_level': 10
        },
        {
            'name': 'Hand Sanitizer 500ml',
            'description': 'Alcohol-based hand sanitizer',
            'price': 6.50,
            'category': 'Health',
            'line_code': 'HEA007',
            'stock_quantity': 40,
            'min_stock_level': 8
        },
        {
            'name': 'Multivitamin Tablets (30 pack)',
            'description': 'Daily multivitamin supplement',
            'price': 12.00,
            'category': 'Health',
            'line_code': 'HEA008',
            'stock_quantity': 35,
            'min_stock_level': 7
        },
    ]

    # Cosmetics and Beauty Products
    cosmetics_products = [
        {
            'name': 'Foundation Cream 30ml',
            'description': 'Liquid foundation makeup',
            'price': 18.00,
            'category': 'Cosmetics',
            'line_code': 'COS001',
            'stock_quantity': 25,
            'min_stock_level': 5
        },
        {
            'name': 'Lipstick Red',
            'description': 'Long-lasting red lipstick',
            'price': 12.00,
            'category': 'Cosmetics',
            'line_code': 'COS002',
            'stock_quantity': 40,
            'min_stock_level': 8
        },
        {
            'name': 'Mascara 10ml',
            'description': 'Volumizing mascara',
            'price': 15.00,
            'category': 'Cosmetics',
            'line_code': 'COS003',
            'stock_quantity': 30,
            'min_stock_level': 6
        },
        {
            'name': 'Nail Polish Red 15ml',
            'description': 'Quick dry nail polish',
            'price': 8.00,
            'category': 'Cosmetics',
            'line_code': 'COS004',
            'stock_quantity': 50,
            'min_stock_level': 10
        },
        {
            'name': 'Perfume 50ml',
            'description': 'Designer fragrance for women',
            'price': 35.00,
            'category': 'Cosmetics',
            'line_code': 'COS005',
            'stock_quantity': 15,
            'min_stock_level': 3
        },
        {
            'name': 'Hair Dye Black',
            'description': 'Permanent hair color',
            'price': 12.00,
            'category': 'Cosmetics',
            'line_code': 'COS006',
            'stock_quantity': 35,
            'min_stock_level': 7
        },
        {
            'name': 'Facial Cleanser 200ml',
            'description': 'Gentle daily facial cleanser',
            'price': 16.00,
            'category': 'Cosmetics',
            'line_code': 'COS007',
            'stock_quantity': 28,
            'min_stock_level': 6
        },
        {
            'name': 'Body Lotion 400ml',
            'description': 'Moisturizing body lotion',
            'price': 14.00,
            'category': 'Cosmetics',
            'line_code': 'COS008',
            'stock_quantity': 32,
            'min_stock_level': 7
        },
    ]

    # Books and Media
    books_media = [
        {
            'name': 'Fiction Novel',
            'description': 'Popular fiction paperback book',
            'price': 12.00,
            'category': 'Books',
            'line_code': 'BOK001',
            'stock_quantity': 25,
            'min_stock_level': 5
        },
        {
            'name': 'Cookbook',
            'description': 'International recipes cookbook',
            'price': 18.00,
            'category': 'Books',
            'line_code': 'BOK002',
            'stock_quantity': 15,
            'min_stock_level': 3
        },
        {
            'name': 'Children\'s Book',
            'description': 'Illustrated children\'s storybook',
            'price': 8.00,
            'category': 'Books',
            'line_code': 'BOK003',
            'stock_quantity': 40,
            'min_stock_level': 8
        },
        {
            'name': 'DVD Movie',
            'description': 'Popular Hollywood movie DVD',
            'price': 6.00,
            'category': 'Media',
            'line_code': 'MED001',
            'stock_quantity': 30,
            'min_stock_level': 6
        },
        {
            'name': 'Music CD',
            'description': 'Popular music album CD',
            'price': 8.00,
            'category': 'Media',
            'line_code': 'MED002',
            'stock_quantity': 20,
            'min_stock_level': 4
        },
        {
            'name': 'Notebook A4',
            'description': 'Lined notebook for writing',
            'price': 3.50,
            'category': 'Books',
            'line_code': 'BOK004',
            'stock_quantity': 60,
            'min_stock_level': 12
        },
    ]

    # Toys and Games
    toys_games = [
        {
            'name': 'Building Blocks Set',
            'description': 'Plastic building blocks for children',
            'price': 25.00,
            'category': 'Toys',
            'line_code': 'TOY001',
            'stock_quantity': 20,
            'min_stock_level': 4
        },
        {
            'name': 'Board Game',
            'description': 'Family board game for 4 players',
            'price': 18.00,
            'category': 'Games',
            'line_code': 'GAM001',
            'stock_quantity': 15,
            'min_stock_level': 3
        },
        {
            'name': 'Stuffed Teddy Bear',
            'description': 'Soft plush teddy bear',
            'price': 12.00,
            'category': 'Toys',
            'line_code': 'TOY002',
            'stock_quantity': 25,
            'min_stock_level': 5
        },
        {
            'name': 'Puzzle 500 pieces',
            'description': 'Jigsaw puzzle for adults',
            'price': 8.00,
            'category': 'Games',
            'line_code': 'GAM002',
            'stock_quantity': 18,
            'min_stock_level': 4
        },
        {
            'name': 'Action Figure',
            'description': 'Superhero action figure',
            'price': 15.00,
            'category': 'Toys',
            'line_code': 'TOY003',
            'stock_quantity': 30,
            'min_stock_level': 6
        },
        {
            'name': 'Playing Cards',
            'description': 'Standard deck of playing cards',
            'price': 3.00,
            'category': 'Games',
            'line_code': 'GAM003',
            'stock_quantity': 50,
            'min_stock_level': 10
        },
    ]

    # Automotive Parts and Accessories
    automotive_products = [
        {
            'name': 'Car Battery 12V',
            'description': 'Automotive car battery',
            'price': 85.00,
            'category': 'Automotive',
            'line_code': 'AUT001',
            'stock_quantity': 8,
            'min_stock_level': 2
        },
        {
            'name': 'Motor Oil 4L',
            'description': 'Synthetic motor oil 5W-30',
            'price': 28.00,
            'category': 'Automotive',
            'line_code': 'AUT002',
            'stock_quantity': 15,
            'min_stock_level': 3
        },
        {
            'name': 'Car Air Freshener',
            'description': 'Vent clip car air freshener',
            'price': 4.00,
            'category': 'Automotive',
            'line_code': 'AUT003',
            'stock_quantity': 40,
            'min_stock_level': 8
        },
        {
            'name': 'Windshield Wipers (pair)',
            'description': 'Universal windshield wiper blades',
            'price': 12.00,
            'category': 'Automotive',
            'line_code': 'AUT004',
            'stock_quantity': 25,
            'min_stock_level': 5
        },
        {
            'name': 'Car Wash Soap 1L',
            'description': 'Foaming car wash soap',
            'price': 8.50,
            'category': 'Automotive',
            'line_code': 'AUT005',
            'stock_quantity': 20,
            'min_stock_level': 4
        },
        {
            'name': 'Tire Pressure Gauge',
            'description': 'Digital tire pressure gauge',
            'price': 6.00,
            'category': 'Automotive',
            'line_code': 'AUT006',
            'stock_quantity': 35,
            'min_stock_level': 7
        },
        {
            'name': 'Car Mat Set',
            'description': 'Universal car floor mats',
            'price': 25.00,
            'category': 'Automotive',
            'line_code': 'AUT007',
            'stock_quantity': 12,
            'min_stock_level': 3
        },
        {
            'name': 'Engine Oil Filter',
            'description': 'Universal engine oil filter',
            'price': 8.00,
            'category': 'Automotive',
            'line_code': 'AUT008',
            'stock_quantity': 30,
            'min_stock_level': 6
        },
    ]

    # Combine all products
    all_products = bakery_products + beverage_products + dried_foods + fresh_fruits + fresh_vegetables + frozen_foods + dairy_products + meat_products + household_products + personal_care + baby_products + pet_products + stationery + alcohol_products + tobacco_products + hardware_products + electronics_products + clothing_products + home_appliances + health_products + cosmetics_products + books_media + toys_games + automotive_products

    created_count = 0
    for product_data in all_products:
        # Check if product already exists
        if not Product.objects.filter(shop=shop, line_code=product_data['line_code']).exists():
            Product.objects.create(shop=shop, **product_data)
            created_count += 1
            print(f"Created: {product_data['name']}")
        else:
            print(f"Skipped (already exists): {product_data['name']}")

    print(f"\nProducts population complete! Created {created_count} new products.")
    print(f"Bakery products: {len(bakery_products)}")
    print(f"Beverage products: {len(beverage_products)}")
    print(f"Dried food products: {len(dried_foods)}")
    print(f"Fresh fruits: {len(fresh_fruits)}")
    print(f"Fresh vegetables: {len(fresh_vegetables)}")
    print(f"Frozen foods: {len(frozen_foods)}")
    print(f"Dairy products: {len(dairy_products)}")
    print(f"Meat products: {len(meat_products)}")
    print(f"Household products: {len(household_products)}")
    print(f"Personal care: {len(personal_care)}")
    print(f"Baby products: {len(baby_products)}")
    print(f"Pet products: {len(pet_products)}")
    print(f"Stationery: {len(stationery)}")
    print(f"Alcohol products: {len(alcohol_products)}")
    print(f"Tobacco products: {len(tobacco_products)}")
    print(f"Hardware products: {len(hardware_products)}")
    print(f"Electronics products: {len(electronics_products)}")
    print(f"Clothing products: {len(clothing_products)}")
    print(f"Home appliances: {len(home_appliances)}")
    print(f"Health products: {len(health_products)}")
    print(f"Cosmetics products: {len(cosmetics_products)}")
    print(f"Books & media: {len(books_media)}")
    print(f"Toys & games: {len(toys_games)}")
    print(f"Automotive products: {len(automotive_products)}")
    print(f"Total products: {len(all_products)}")

if __name__ == '__main__':
    populate_bakery_products()
