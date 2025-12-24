dishes  = "sadza and fish", "sadza and matemba", "sadza and madora", "sadza and vegetables"

requested_dish = "sadza and fish","rice and chicken", "sadza and matemba"


for r in requested_dish:
    if r in dishes:
        print("Serving ", r, ".")
    else:
        print("Sorry we are out of",  r)
