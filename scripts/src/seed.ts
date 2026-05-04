import { db } from "@workspace/db";
import {
  usersTable, staffTable, restaurantTablesTable, menuCategoriesTable, menuItemsTable,
  reservationsTable, customersTable, inventoryItemsTable, settingsTable, notificationsTable,
} from "@workspace/db";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function seed() {
  console.log("Seeding database...");

  // Upsert settings
  const existingSettings = await db.select().from(settingsTable);
  if (existingSettings.length === 0) {
    await db.insert(settingsTable).values({
      restaurantName: "RestoraPro Demo",
      address: "123 Main Street, Downtown",
      phone: "+1 (555) 000-1234",
      currency: "USD",
      taxRate: "8.50",
      serviceChargeRate: "10.00",
      openingTime: "08:00",
      closingTime: "23:00",
      receiptFooter: "Thank you for dining with us! We hope to see you again soon.",
      timezone: "America/New_York",
    });
  }

  // Users
  const existingUsers = await db.select().from(usersTable);
  if (existingUsers.length === 0) {
    const pw = await hashPassword("password123");
    await db.insert(usersTable).values([
      { name: "Alex Admin",       email: "admin@restorapro.com",     passwordHash: pw, role: "admin" },
      { name: "Maria Manager",    email: "manager@restorapro.com",   passwordHash: pw, role: "manager" },
      { name: "Walter Waiter",    email: "waiter@restorapro.com",    passwordHash: pw, role: "waiter" },
      { name: "Kevin Kitchen",    email: "kitchen@restorapro.com",   passwordHash: pw, role: "kitchen" },
      { name: "Barry Bar",        email: "bar@restorapro.com",       passwordHash: pw, role: "bar" },
      { name: "Casey Cashier",    email: "cashier@restorapro.com",   passwordHash: pw, role: "cashier" },
      { name: "Rachel Reception", email: "reception@restorapro.com", passwordHash: pw, role: "receptionist" },
      { name: "Ivan Inventory",   email: "inventory@restorapro.com", passwordHash: pw, role: "inventory_manager" },
    ]);
    console.log("Users seeded.");
  }

  // Staff linked to users
  const existingStaff = await db.select().from(staffTable);
  if (existingStaff.length === 0) {
    const users = await db.select().from(usersTable);
    const userMap = new Map(users.map(u => [u.email, u]));
    await db.insert(staffTable).values([
      { userId: userMap.get("admin@restorapro.com")!.id,     name: "Alex Admin",       email: "admin@restorapro.com",     phone: "+1-555-0001", role: "admin",             active: true, onShift: true,  shiftStart: new Date() },
      { userId: userMap.get("manager@restorapro.com")!.id,   name: "Maria Manager",    email: "manager@restorapro.com",   phone: "+1-555-0002", role: "manager",           active: true, onShift: true,  shiftStart: new Date() },
      { userId: userMap.get("waiter@restorapro.com")!.id,    name: "Walter Waiter",    email: "waiter@restorapro.com",    phone: "+1-555-0003", role: "waiter",            active: true, onShift: true,  shiftStart: new Date() },
      { userId: userMap.get("kitchen@restorapro.com")!.id,   name: "Kevin Kitchen",    email: "kitchen@restorapro.com",   phone: "+1-555-0004", role: "kitchen",           active: true, onShift: true,  shiftStart: new Date() },
      { userId: userMap.get("bar@restorapro.com")!.id,       name: "Barry Bar",        email: "bar@restorapro.com",       phone: "+1-555-0005", role: "bar",               active: true, onShift: true,  shiftStart: new Date() },
      { userId: userMap.get("cashier@restorapro.com")!.id,   name: "Casey Cashier",    email: "cashier@restorapro.com",   phone: "+1-555-0006", role: "cashier",           active: true, onShift: false },
      { userId: userMap.get("reception@restorapro.com")!.id, name: "Rachel Reception", email: "reception@restorapro.com", phone: "+1-555-0007", role: "receptionist",      active: true, onShift: true,  shiftStart: new Date() },
      { userId: userMap.get("inventory@restorapro.com")!.id, name: "Ivan Inventory",   email: "inventory@restorapro.com", phone: "+1-555-0008", role: "inventory_manager", active: true, onShift: false },
      { name: "Sophie Server",   email: "sophie@restorapro.com",   phone: "+1-555-0009", role: "waiter",   active: true,  onShift: true,  shiftStart: new Date() },
      { name: "Tom Turnstile",   email: "tom@restorapro.com",      phone: "+1-555-0010", role: "waiter",   active: true,  onShift: false },
      { name: "Diana Dishwasher",email: "diana@restorapro.com",    phone: "+1-555-0011", role: "kitchen",  active: true,  onShift: true,  shiftStart: new Date() },
    ]);
    console.log("Staff seeded.");
  }

  // Tables
  const existingTables = await db.select().from(restaurantTablesTable);
  if (existingTables.length === 0) {
    await db.insert(restaurantTablesTable).values([
      { number: 1,  name: "Window 1",  capacity: 2, status: "available", section: "window",  positionX: 50,  positionY: 50 },
      { number: 2,  name: "Window 2",  capacity: 2, status: "occupied",  section: "window",  positionX: 150, positionY: 50 },
      { number: 3,  name: "Window 3",  capacity: 4, status: "available", section: "window",  positionX: 250, positionY: 50 },
      { number: 4,  name: "Center 1",  capacity: 4, status: "available", section: "main",    positionX: 50,  positionY: 170 },
      { number: 5,  name: "Center 2",  capacity: 6, status: "reserved",  section: "main",    positionX: 170, positionY: 170 },
      { number: 6,  name: "Center 3",  capacity: 4, status: "occupied",  section: "main",    positionX: 310, positionY: 170 },
      { number: 7,  name: "Center 4",  capacity: 4, status: "available", section: "main",    positionX: 50,  positionY: 290 },
      { number: 8,  name: "Center 5",  capacity: 8, status: "available", section: "main",    positionX: 170, positionY: 290 },
      { number: 9,  name: "Booth 1",   capacity: 4, status: "waiting_payment", section: "booth", positionX: 420, positionY: 50  },
      { number: 10, name: "Booth 2",   capacity: 4, status: "available", section: "booth",   positionX: 420, positionY: 170 },
      { number: 11, name: "Booth 3",   capacity: 4, status: "cleaning",  section: "booth",   positionX: 420, positionY: 290 },
      { number: 12, name: "Patio 1",   capacity: 6, status: "available", section: "patio",   positionX: 50,  positionY: 410 },
      { number: 13, name: "Patio 2",   capacity: 6, status: "available", section: "patio",   positionX: 200, positionY: 410 },
      { number: 14, name: "Patio 3",   capacity: 8, status: "occupied",  section: "patio",   positionX: 360, positionY: 410 },
      { number: 15, name: "VIP Room",  capacity: 12, status: "available", section: "vip",    positionX: 50,  positionY: 530 },
    ]);
    console.log("Tables seeded.");
  }

  // Menu categories + items
  const existingCategories = await db.select().from(menuCategoriesTable);
  if (existingCategories.length === 0) {
    const [starters, mains, pasta, pizza, desserts, nonAlcoholic, beer, wine, cocktails, spirits] = await db.insert(menuCategoriesTable).values([
      { name: "Starters",      description: "Appetizers and small plates", sortOrder: 1 },
      { name: "Main Courses",  description: "Hearty main dishes",          sortOrder: 2 },
      { name: "Pasta & Risotto",description: "Italian classics",           sortOrder: 3 },
      { name: "Pizza",         description: "Wood-fired stone pizzas",     sortOrder: 4 },
      { name: "Desserts",      description: "Sweet endings",               sortOrder: 5 },
      { name: "Soft Drinks",   description: "Non-alcoholic beverages",     sortOrder: 6 },
      { name: "Beer & Cider",  description: "Draft and bottled beers",     sortOrder: 7 },
      { name: "Wine",          description: "Red, white, and rosé",        sortOrder: 8 },
      { name: "Cocktails",     description: "Craft cocktails",             sortOrder: 9 },
      { name: "Spirits",       description: "Whisky, gin, vodka and more", sortOrder: 10 },
    ]).returning();

    await db.insert(menuItemsTable).values([
      // Starters
      { name: "Bruschetta al Pomodoro", description: "Toasted bread, cherry tomatoes, fresh basil, olive oil", categoryId: starters.id, price: "8.50",  department: "kitchen", available: true, preparationTime: 8 },
      { name: "Burrata e Prosciutto",   description: "Creamy burrata with San Daniele ham and rocket",          categoryId: starters.id, price: "14.00", department: "kitchen", available: true, preparationTime: 5 },
      { name: "Calamari Fritti",        description: "Crispy fried squid rings with aioli and lemon",           categoryId: starters.id, price: "12.00", department: "kitchen", available: true, preparationTime: 10 },
      { name: "Caesar Salad",           description: "Romaine, parmesan, croutons, house Caesar dressing",      categoryId: starters.id, price: "11.00", department: "kitchen", available: true, preparationTime: 7 },
      { name: "Soup of the Day",        description: "Ask your server for today's selection",                   categoryId: starters.id, price: "7.50",  department: "kitchen", available: true, preparationTime: 5 },

      // Mains
      { name: "Grilled Salmon",         description: "Atlantic salmon, asparagus, lemon butter sauce",          categoryId: mains.id, price: "26.00", department: "kitchen", available: true, preparationTime: 20 },
      { name: "Ribeye Steak 300g",      description: "Prime beef, fries, compound butter, seasonal salad",      categoryId: mains.id, price: "38.00", department: "kitchen", available: true, preparationTime: 25 },
      { name: "Chicken Milanese",       description: "Crispy chicken breast, arugula, cherry tomatoes, parmesan",categoryId: mains.id, price: "22.00", department: "kitchen", available: true, preparationTime: 18 },
      { name: "Vegetarian Wellington",  description: "Roasted portobello, spinach and feta in puff pastry",     categoryId: mains.id, price: "19.00", department: "kitchen", available: true, preparationTime: 25 },
      { name: "Fish & Chips",           description: "Beer-battered cod, chunky chips, mushy peas, tartare",    categoryId: mains.id, price: "18.00", department: "kitchen", available: true, preparationTime: 15 },

      // Pasta
      { name: "Spaghetti Carbonara",    description: "Egg, guanciale, Pecorino Romano, black pepper",           categoryId: pasta.id, price: "16.00", department: "kitchen", available: true, preparationTime: 12 },
      { name: "Penne Arrabbiata",       description: "Tomato, chili, garlic, fresh parsley",                   categoryId: pasta.id, price: "13.50", department: "kitchen", available: true, preparationTime: 12 },
      { name: "Tagliatelle al Ragù",    description: "Slow-cooked Bolognese sauce, Parmigiano",                categoryId: pasta.id, price: "17.00", department: "kitchen", available: true, preparationTime: 10 },
      { name: "Risotto ai Funghi",      description: "Wild mushroom risotto, truffle oil, Parmigiano",          categoryId: pasta.id, price: "18.50", department: "kitchen", available: true, preparationTime: 20 },

      // Pizza
      { name: "Margherita",             description: "San Marzano tomato, fior di latte, fresh basil",          categoryId: pizza.id, price: "13.00", department: "kitchen", available: true, preparationTime: 15 },
      { name: "Diavola",                description: "Spicy Calabrian salami, mozzarella, chili flakes",        categoryId: pizza.id, price: "15.00", department: "kitchen", available: true, preparationTime: 15 },
      { name: "Prosciutto e Funghi",    description: "Ham, mushrooms, mozzarella, tomato",                      categoryId: pizza.id, price: "15.50", department: "kitchen", available: true, preparationTime: 15 },
      { name: "Quattro Formaggi",       description: "Mozzarella, Gorgonzola, Taleggio, Grana Padano",          categoryId: pizza.id, price: "16.00", department: "kitchen", available: true, preparationTime: 15 },

      // Desserts
      { name: "Tiramisu",               description: "Classic Italian dessert with mascarpone and espresso",     categoryId: desserts.id, price: "8.00",  department: "kitchen", available: true, preparationTime: 3 },
      { name: "Panna Cotta",            description: "Vanilla cream with berry coulis",                          categoryId: desserts.id, price: "7.50",  department: "kitchen", available: true, preparationTime: 3 },
      { name: "Chocolate Fondant",      description: "Warm dark chocolate cake, vanilla gelato",                 categoryId: desserts.id, price: "9.00",  department: "kitchen", available: true, preparationTime: 12 },

      // Soft Drinks
      { name: "Still Water 500ml",      description: "Chilled still mineral water",                              categoryId: nonAlcoholic.id, price: "3.00",  department: "bar", available: true, preparationTime: 1 },
      { name: "Sparkling Water 500ml",  description: "Chilled sparkling mineral water",                          categoryId: nonAlcoholic.id, price: "3.00",  department: "bar", available: true, preparationTime: 1 },
      { name: "Coca-Cola",              description: "330ml can",                                                categoryId: nonAlcoholic.id, price: "3.50",  department: "bar", available: true, preparationTime: 1 },
      { name: "Fresh Orange Juice",     description: "Freshly squeezed, large glass",                            categoryId: nonAlcoholic.id, price: "5.00",  department: "bar", available: true, preparationTime: 3 },
      { name: "Iced Tea",               description: "House-made peach iced tea",                                categoryId: nonAlcoholic.id, price: "4.50",  department: "bar", available: true, preparationTime: 2 },
      { name: "Espresso",               description: "Double shot",                                              categoryId: nonAlcoholic.id, price: "3.50",  department: "bar", available: true, preparationTime: 3 },
      { name: "Cappuccino",             description: "Espresso with steamed milk foam",                          categoryId: nonAlcoholic.id, price: "4.50",  department: "bar", available: true, preparationTime: 4 },

      // Beer
      { name: "Draft Lager Pint",       description: "House draft lager 568ml",                                  categoryId: beer.id, price: "6.00",  department: "bar", available: true, preparationTime: 2 },
      { name: "Draft IPA Pint",         description: "Hoppy craft IPA on draft 568ml",                           categoryId: beer.id, price: "6.50",  department: "bar", available: true, preparationTime: 2 },
      { name: "Peroni Nastro Azzurro",  description: "330ml bottle",                                             categoryId: beer.id, price: "5.00",  department: "bar", available: true, preparationTime: 1 },
      { name: "Corona Extra",           description: "330ml bottle with lime",                                   categoryId: beer.id, price: "5.00",  department: "bar", available: true, preparationTime: 1 },

      // Wine
      { name: "House Red Wine Glass",   description: "Montepulciano d'Abruzzo, 175ml",                           categoryId: wine.id, price: "7.00",  department: "bar", available: true, preparationTime: 1 },
      { name: "House White Wine Glass", description: "Pinot Grigio delle Venezie, 175ml",                        categoryId: wine.id, price: "7.00",  department: "bar", available: true, preparationTime: 1 },
      { name: "Prosecco Glass",         description: "Treviso DOC, 125ml",                                       categoryId: wine.id, price: "8.50",  department: "bar", available: true, preparationTime: 1 },
      { name: "Bottle Barolo",          description: "Barolo DOCG 2019, 750ml",                                  categoryId: wine.id, price: "52.00", department: "bar", available: true, preparationTime: 2 },

      // Cocktails
      { name: "Aperol Spritz",          description: "Aperol, Prosecco, soda, orange slice",                     categoryId: cocktails.id, price: "11.00", department: "bar", available: true, preparationTime: 4 },
      { name: "Negroni",                description: "Campari, sweet vermouth, gin",                             categoryId: cocktails.id, price: "12.00", department: "bar", available: true, preparationTime: 4 },
      { name: "Espresso Martini",       description: "Vodka, Kahlua, fresh espresso, sugar syrup",               categoryId: cocktails.id, price: "13.00", department: "bar", available: true, preparationTime: 5 },
      { name: "Mojito",                 description: "Rum, lime, mint, soda, sugar",                             categoryId: cocktails.id, price: "12.00", department: "bar", available: true, preparationTime: 5 },
      { name: "Margarita",              description: "Tequila, triple sec, fresh lime, salt rim",                 categoryId: cocktails.id, price: "12.00", department: "bar", available: true, preparationTime: 4 },

      // Spirits
      { name: "Hendrick's Gin 50ml",    description: "With fever-tree tonic and cucumber",                       categoryId: spirits.id, price: "11.00", department: "bar", available: true, preparationTime: 2 },
      { name: "Johnnie Walker Black",   description: "Blended Scotch whisky, 50ml",                              categoryId: spirits.id, price: "9.50",  department: "bar", available: true, preparationTime: 1 },
      { name: "Grey Goose Vodka 50ml",  description: "French premium vodka",                                     categoryId: spirits.id, price: "10.00", department: "bar", available: true, preparationTime: 1 },
    ]);
    console.log("Menu seeded.");
  }

  // Customers
  const existingCustomers = await db.select().from(customersTable);
  if (existingCustomers.length === 0) {
    await db.insert(customersTable).values([
      { name: "James Anderson",  phone: "+1-555-1001", email: "james.anderson@email.com",  visitCount: 14, totalSpent: "420.50", notes: "Allergic to nuts" },
      { name: "Sarah Williams",  phone: "+1-555-1002", email: "sarah.w@email.com",         visitCount: 8,  totalSpent: "195.00" },
      { name: "Marco Rossi",     phone: "+1-555-1003", email: "marco.rossi@email.com",     visitCount: 22, totalSpent: "890.00", notes: "Regular — prefers table by window" },
      { name: "Emma Clarke",     phone: "+1-555-1004", email: "emma.c@email.com",          visitCount: 3,  totalSpent: "67.50" },
      { name: "David Kim",       phone: "+1-555-1005",                                     visitCount: 5,  totalSpent: "156.00" },
      { name: "Sofia Rodriguez", phone: "+1-555-1006", email: "sofia.r@email.com",         visitCount: 11, totalSpent: "312.00", notes: "Vegetarian" },
      { name: "Oliver Brown",    phone: "+1-555-1007", email: "oliver.b@email.com",        visitCount: 1,  totalSpent: "42.00" },
      { name: "Yuki Tanaka",     phone: "+1-555-1008", email: "yuki.t@email.com",          visitCount: 7,  totalSpent: "231.50" },
    ]);
    console.log("Customers seeded.");
  }

  // Reservations
  const existingReservations = await db.select().from(reservationsTable);
  if (existingReservations.length === 0) {
    const today = new Date().toISOString().slice(0, 10);
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    await db.insert(reservationsTable).values([
      { customerName: "Marco Rossi",     customerPhone: "+1-555-1003", customerEmail: "marco.rossi@email.com",  guestCount: 2, date: today,    time: "12:30", status: "confirmed", notes: "Anniversary dinner" },
      { customerName: "Sarah Williams",  customerPhone: "+1-555-1002", customerEmail: "sarah.w@email.com",      guestCount: 4, date: today,    time: "13:00", status: "seated" },
      { customerName: "James Anderson",  customerPhone: "+1-555-1001", customerEmail: "james@email.com",        guestCount: 2, date: today,    time: "19:00", status: "confirmed", notes: "Nut allergy!" },
      { customerName: "Emma Clarke",     customerPhone: "+1-555-1004",                                          guestCount: 3, date: today,    time: "20:00", status: "pending" },
      { customerName: "Smith Family",    customerPhone: "+1-555-2001",                                          guestCount: 6, date: tomorrow, time: "12:00", status: "confirmed" },
      { customerName: "Yuki Tanaka",     customerPhone: "+1-555-1008", customerEmail: "yuki.t@email.com",       guestCount: 2, date: tomorrow, time: "19:30", status: "pending" },
    ]);
    console.log("Reservations seeded.");
  }

  // Inventory
  const existingInventory = await db.select().from(inventoryItemsTable);
  if (existingInventory.length === 0) {
    await db.insert(inventoryItemsTable).values([
      { name: "Chicken Breast",      unit: "kg",    currentStock: "12.5",  minimumStock: "5.0",   supplier: "Metro Foods",    costPrice: "8.50" },
      { name: "Beef Ribeye",         unit: "kg",    currentStock: "4.2",   minimumStock: "3.0",   supplier: "Premium Meats",  costPrice: "22.00" },
      { name: "Atlantic Salmon",     unit: "kg",    currentStock: "2.8",   minimumStock: "4.0",   supplier: "Ocean Fresh",    costPrice: "15.00" },
      { name: "All-Purpose Flour",   unit: "kg",    currentStock: "25.0",  minimumStock: "10.0",  supplier: "Bakery Depot",   costPrice: "1.20" },
      { name: "San Marzano Tomato",  unit: "kg",    currentStock: "8.0",   minimumStock: "3.0",   supplier: "Italian Imports",costPrice: "4.50" },
      { name: "Mozzarella",          unit: "kg",    currentStock: "6.5",   minimumStock: "3.0",   supplier: "Dairy Direct",   costPrice: "9.00" },
      { name: "Parmigiano Reggiano", unit: "kg",    currentStock: "2.0",   minimumStock: "1.5",   supplier: "Italian Imports",costPrice: "28.00" },
      { name: "Olive Oil Extra Virgin",unit: "liter",currentStock: "7.5",  minimumStock: "3.0",   supplier: "Mediterranean",  costPrice: "12.00" },
      { name: "Pasta - Spaghetti",   unit: "kg",    currentStock: "15.0",  minimumStock: "5.0",   supplier: "Pasta Co",       costPrice: "2.00" },
      { name: "Arborio Rice",        unit: "kg",    currentStock: "8.0",   minimumStock: "3.0",   supplier: "Italian Imports",costPrice: "3.50" },
      { name: "Heavy Cream",         unit: "liter", currentStock: "5.0",   minimumStock: "2.0",   supplier: "Dairy Direct",   costPrice: "3.00" },
      { name: "Eggs",                unit: "pcs",   currentStock: "120",   minimumStock: "48",    supplier: "Farm Fresh",     costPrice: "0.35" },
      { name: "Lemons",              unit: "pcs",   currentStock: "30",    minimumStock: "20",    supplier: "Produce Plus",   costPrice: "0.50" },
      { name: "Fresh Basil",         unit: "g",     currentStock: "150",   minimumStock: "100",   supplier: "Herb Garden",    costPrice: "0.05" },
      { name: "Aperol",              unit: "liter", currentStock: "3.5",   minimumStock: "2.0",   supplier: "Spirits Wholesale",costPrice: "18.00" },
      { name: "Prosecco Treviso",    unit: "liter", currentStock: "6.0",   minimumStock: "3.0",   supplier: "Wine & More",    costPrice: "8.00" },
      { name: "Draft Lager",         unit: "liter", currentStock: "40.0",  minimumStock: "20.0",  supplier: "Brewery Direct", costPrice: "1.50" },
      { name: "Vodka - Grey Goose",  unit: "liter", currentStock: "1.5",   minimumStock: "1.0",   supplier: "Spirits Wholesale",costPrice: "35.00" },
      { name: "Cola Syrup",          unit: "liter", currentStock: "4.0",   minimumStock: "2.0",   supplier: "Beverage Co",    costPrice: "6.00" },
      { name: "Napkins",             unit: "pcs",   currentStock: "500",   minimumStock: "200",   supplier: "Restaurant Supplies",costPrice: "0.03" },
    ]);
    console.log("Inventory seeded.");
  }

  // Notifications
  const existingNotifications = await db.select().from(notificationsTable);
  if (existingNotifications.length === 0) {
    await db.insert(notificationsTable).values([
      { type: "inventory:low_stock",  message: "Atlantic Salmon is below minimum stock level",  targetRole: "inventory_manager", read: false },
      { type: "reservation:created",  message: "New reservation for James Anderson at 19:00 today", targetRole: "receptionist", read: false },
      { type: "kitchen:item_ready",   message: "Bruschetta al Pomodoro ready for Table 6",      targetRole: "waiter",           read: false },
      { type: "bill:requested",       message: "Bill requested for Table 9",                    targetRole: "cashier",          read: false },
      { type: "payment:completed",    message: "Payment of $87.50 received for Order #1",       targetRole: "manager",          read: true },
    ]);
    console.log("Notifications seeded.");
  }

  console.log("Seed complete!");
}

seed().catch(err => {
  console.error("Seed failed:", err);
  process.exit(1);
});
