import { db } from "@workspace/db";
import {
  usersTable, staffTable, restaurantTablesTable, menuCategoriesTable, menuItemsTable,
  reservationsTable, customersTable, inventoryItemsTable, settingsTable, notificationsTable,
} from "@workspace/db";
import { eq } from "drizzle-orm";
import { hashPassword } from "./lib/crypto";

const PRIMARY_ADMIN_EMAIL = "emirhelshani@gmail.com";
const DEMO_PASSWORD = "password123";

const demoUsers = [
  { name: "Emir Helshani",    email: PRIMARY_ADMIN_EMAIL,              role: "admin" as const },
  { name: "Alex Admin",       email: "admin@restorapro.com",          role: "admin" as const },
  { name: "Maria Manager",    email: "manager@restorapro.com",        role: "manager" as const },
  { name: "Walter Waiter",    email: "waiter@restorapro.com",         role: "waiter" as const },
  { name: "Kevin Kitchen",    email: "kitchen@restorapro.com",        role: "kitchen" as const },
  { name: "Barry Bar",        email: "bar@restorapro.com",            role: "bar" as const },
  { name: "Casey Cashier",    email: "cashier@restorapro.com",        role: "cashier" as const },
  { name: "Rachel Reception", email: "reception@restorapro.com",      role: "receptionist" as const },
  { name: "Ivan Inventory",   email: "inventory@restorapro.com",      role: "inventory_manager" as const },
];

const linkedStaffMembers = [
  { name: "Emir Helshani",    email: PRIMARY_ADMIN_EMAIL,              phone: "+1-555-0000", role: "admin",             active: true, onShift: true },
  { name: "Alex Admin",       email: "admin@restorapro.com",          phone: "+1-555-0001", role: "admin",             active: true, onShift: true },
  { name: "Maria Manager",    email: "manager@restorapro.com",        phone: "+1-555-0002", role: "manager",           active: true, onShift: true },
  { name: "Walter Waiter",    email: "waiter@restorapro.com",         phone: "+1-555-0003", role: "waiter",            active: true, onShift: true },
  { name: "Kevin Kitchen",    email: "kitchen@restorapro.com",        phone: "+1-555-0004", role: "kitchen",           active: true, onShift: true },
  { name: "Barry Bar",        email: "bar@restorapro.com",            phone: "+1-555-0005", role: "bar",               active: true, onShift: true },
  { name: "Casey Cashier",    email: "cashier@restorapro.com",        phone: "+1-555-0006", role: "cashier",           active: true, onShift: false },
  { name: "Rachel Reception", email: "reception@restorapro.com",      phone: "+1-555-0007", role: "receptionist",      active: true, onShift: true },
  { name: "Ivan Inventory",   email: "inventory@restorapro.com",      phone: "+1-555-0008", role: "inventory_manager", active: true, onShift: false },
];

const extraStaffMembers = [
  { name: "Sophie Server", email: "sophie@restorapro.com", phone: "+1-555-0009", role: "waiter",  active: true, onShift: true },
  { name: "Tom Turnstile", email: "tom@restorapro.com",    phone: "+1-555-0010", role: "waiter",  active: true, onShift: false },
  { name: "Diana Kitchen", email: "diana@restorapro.com",  phone: "+1-555-0011", role: "kitchen", active: true, onShift: true },
];

async function ensureStaffMember(values: {
  userId?: number | null;
  name: string;
  email: string;
  phone?: string | null;
  role: string;
  active: boolean;
  onShift: boolean;
}) {
  const [existing] = await db
    .select()
    .from(staffTable)
    .where(eq(staffTable.email, values.email));

  const baseData = {
    userId: values.userId ?? null,
    name: values.name,
    email: values.email,
    phone: values.phone ?? null,
    role: values.role,
    active: values.active,
    onShift: values.onShift,
    shiftStart: values.onShift ? new Date() : null,
  };

  if (existing) {
    const [updated] = await db
      .update(staffTable)
      .set(baseData)
      .where(eq(staffTable.id, existing.id))
      .returning();

    return updated;
  }

  const [created] = await db.insert(staffTable).values(baseData).returning();
  return created;
}

async function seed() {
  console.log("Seeding database...");

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

  const passwordHash = await hashPassword(DEMO_PASSWORD);
  for (const demoUser of demoUsers) {
    await db
      .insert(usersTable)
      .values({
        name: demoUser.name,
        email: demoUser.email.toLowerCase(),
        passwordHash,
        role: demoUser.role,
        active: true,
      })
      .onConflictDoUpdate({
        target: usersTable.email,
        set: {
          name: demoUser.name,
          passwordHash,
          role: demoUser.role,
          active: true,
        },
      });
  }
  console.log("Users seeded.");

  const users = await db.select().from(usersTable);
  const userMap = new Map(users.map((user) => [user.email, user]));

  for (const member of linkedStaffMembers) {
    await ensureStaffMember({
      ...member,
      userId: userMap.get(member.email)?.id ?? null,
    });
  }

  for (const member of extraStaffMembers) {
    await ensureStaffMember(member);
  }
  console.log("Staff seeded.");

  const existingTables = await db.select().from(restaurantTablesTable);
  if (existingTables.length === 0) {
    await db.insert(restaurantTablesTable).values([
      { number: 1,  name: "Window 1",  capacity: 2, status: "available",      section: "window", positionX: 50,  positionY: 50 },
      { number: 2,  name: "Window 2",  capacity: 2, status: "occupied",       section: "window", positionX: 160, positionY: 50 },
      { number: 3,  name: "Window 3",  capacity: 4, status: "available",      section: "window", positionX: 270, positionY: 50 },
      { number: 4,  name: "Center 1",  capacity: 4, status: "available",      section: "main",   positionX: 50,  positionY: 180 },
      { number: 5,  name: "Center 2",  capacity: 6, status: "reserved",       section: "main",   positionX: 180, positionY: 180 },
      { number: 6,  name: "Center 3",  capacity: 4, status: "occupied",       section: "main",   positionX: 320, positionY: 180 },
      { number: 7,  name: "Center 4",  capacity: 4, status: "available",      section: "main",   positionX: 50,  positionY: 310 },
      { number: 8,  name: "Center 5",  capacity: 8, status: "available",      section: "main",   positionX: 180, positionY: 310 },
      { number: 9,  name: "Booth 1",   capacity: 4, status: "waiting_payment",section: "booth",  positionX: 430, positionY: 50 },
      { number: 10, name: "Booth 2",   capacity: 4, status: "available",      section: "booth",  positionX: 430, positionY: 180 },
      { number: 11, name: "Booth 3",   capacity: 4, status: "cleaning",       section: "booth",  positionX: 430, positionY: 310 },
      { number: 12, name: "Patio 1",   capacity: 6, status: "available",      section: "patio",  positionX: 50,  positionY: 440 },
      { number: 13, name: "Patio 2",   capacity: 6, status: "available",      section: "patio",  positionX: 200, positionY: 440 },
      { number: 14, name: "Patio 3",   capacity: 8, status: "occupied",       section: "patio",  positionX: 360, positionY: 440 },
      { number: 15, name: "VIP Room",  capacity: 12,status: "available",      section: "vip",    positionX: 50,  positionY: 570 },
    ]);
    console.log("Tables seeded.");
  }

  const existingCategories = await db.select().from(menuCategoriesTable);
  if (existingCategories.length === 0) {
    const cats = await db.insert(menuCategoriesTable).values([
      { name: "Starters",        description: "Appetizers and small plates",  sortOrder: 1 },
      { name: "Main Courses",    description: "Hearty main dishes",            sortOrder: 2 },
      { name: "Pasta & Risotto", description: "Italian classics",              sortOrder: 3 },
      { name: "Pizza",           description: "Wood-fired stone pizzas",       sortOrder: 4 },
      { name: "Desserts",        description: "Sweet endings",                 sortOrder: 5 },
      { name: "Soft Drinks",     description: "Non-alcoholic beverages",       sortOrder: 6 },
      { name: "Beer & Cider",    description: "Draft and bottled beers",       sortOrder: 7 },
      { name: "Wine",            description: "Red, white, and rose",          sortOrder: 8 },
      { name: "Cocktails",       description: "Craft cocktails",               sortOrder: 9 },
      { name: "Spirits",         description: "Whisky, gin, vodka and more",   sortOrder: 10 },
    ]).returning();

    const cid = (name: string) => cats.find(c => c.name === name)!.id;

    await db.insert(menuItemsTable).values([
      { name: "Bruschetta al Pomodoro", description: "Toasted bread, cherry tomatoes, basil, olive oil",     categoryId: cid("Starters"),        price: "8.50",  department: "kitchen", available: true, preparationTime: 8 },
      { name: "Burrata e Prosciutto",   description: "Creamy burrata, San Daniele ham, rocket",               categoryId: cid("Starters"),        price: "14.00", department: "kitchen", available: true, preparationTime: 5 },
      { name: "Calamari Fritti",        description: "Crispy fried squid rings with aioli and lemon",         categoryId: cid("Starters"),        price: "12.00", department: "kitchen", available: true, preparationTime: 10 },
      { name: "Caesar Salad",           description: "Romaine, parmesan, croutons, Caesar dressing",          categoryId: cid("Starters"),        price: "11.00", department: "kitchen", available: true, preparationTime: 7 },
      { name: "Soup of the Day",        description: "Ask your server for today's selection",                 categoryId: cid("Starters"),        price: "7.50",  department: "kitchen", available: true, preparationTime: 5 },
      { name: "Grilled Salmon",         description: "Atlantic salmon, asparagus, lemon butter sauce",        categoryId: cid("Main Courses"),    price: "26.00", department: "kitchen", available: true, preparationTime: 20 },
      { name: "Ribeye Steak 300g",      description: "Prime beef, fries, compound butter, seasonal salad",    categoryId: cid("Main Courses"),    price: "38.00", department: "kitchen", available: true, preparationTime: 25 },
      { name: "Chicken Milanese",       description: "Crispy chicken breast, arugula, cherry tomatoes",       categoryId: cid("Main Courses"),    price: "22.00", department: "kitchen", available: true, preparationTime: 18 },
      { name: "Vegetarian Wellington",  description: "Portobello, spinach and feta in puff pastry",           categoryId: cid("Main Courses"),    price: "19.00", department: "kitchen", available: true, preparationTime: 25 },
      { name: "Fish & Chips",           description: "Beer-battered cod, chunky chips, mushy peas, tartare", categoryId: cid("Main Courses"),    price: "18.00", department: "kitchen", available: true, preparationTime: 15 },
      { name: "Spaghetti Carbonara",    description: "Egg, guanciale, Pecorino Romano, black pepper",         categoryId: cid("Pasta & Risotto"), price: "16.00", department: "kitchen", available: true, preparationTime: 12 },
      { name: "Penne Arrabbiata",       description: "Tomato, chili, garlic, fresh parsley",                  categoryId: cid("Pasta & Risotto"), price: "13.50", department: "kitchen", available: true, preparationTime: 12 },
      { name: "Tagliatelle al Ragu",    description: "Slow-cooked Bolognese sauce, Parmigiano",               categoryId: cid("Pasta & Risotto"), price: "17.00", department: "kitchen", available: true, preparationTime: 10 },
      { name: "Risotto ai Funghi",      description: "Wild mushroom risotto, truffle oil, Parmigiano",        categoryId: cid("Pasta & Risotto"), price: "18.50", department: "kitchen", available: true, preparationTime: 20 },
      { name: "Margherita",             description: "San Marzano tomato, fior di latte, fresh basil",        categoryId: cid("Pizza"),           price: "13.00", department: "kitchen", available: true, preparationTime: 15 },
      { name: "Diavola",                description: "Spicy Calabrian salami, mozzarella, chili flakes",      categoryId: cid("Pizza"),           price: "15.00", department: "kitchen", available: true, preparationTime: 15 },
      { name: "Prosciutto e Funghi",    description: "Ham, mushrooms, mozzarella, tomato",                    categoryId: cid("Pizza"),           price: "15.50", department: "kitchen", available: true, preparationTime: 15 },
      { name: "Quattro Formaggi",       description: "Mozzarella, Gorgonzola, Taleggio, Grana Padano",        categoryId: cid("Pizza"),           price: "16.00", department: "kitchen", available: true, preparationTime: 15 },
      { name: "Tiramisu",               description: "Classic Italian dessert, mascarpone, espresso",         categoryId: cid("Desserts"),        price: "8.00",  department: "kitchen", available: true, preparationTime: 3 },
      { name: "Panna Cotta",            description: "Vanilla cream with berry coulis",                       categoryId: cid("Desserts"),        price: "7.50",  department: "kitchen", available: true, preparationTime: 3 },
      { name: "Chocolate Fondant",      description: "Warm dark chocolate cake, vanilla gelato",              categoryId: cid("Desserts"),        price: "9.00",  department: "kitchen", available: true, preparationTime: 12 },
      { name: "Still Water 500ml",      description: "Chilled still mineral water",                           categoryId: cid("Soft Drinks"),     price: "3.00",  department: "bar",     available: true, preparationTime: 1 },
      { name: "Sparkling Water 500ml",  description: "Chilled sparkling mineral water",                       categoryId: cid("Soft Drinks"),     price: "3.00",  department: "bar",     available: true, preparationTime: 1 },
      { name: "Coca-Cola",              description: "330ml can",                                              categoryId: cid("Soft Drinks"),     price: "3.50",  department: "bar",     available: true, preparationTime: 1 },
      { name: "Fresh Orange Juice",     description: "Freshly squeezed, large glass",                         categoryId: cid("Soft Drinks"),     price: "5.00",  department: "bar",     available: true, preparationTime: 3 },
      { name: "Iced Tea",               description: "House-made peach iced tea",                             categoryId: cid("Soft Drinks"),     price: "4.50",  department: "bar",     available: true, preparationTime: 2 },
      { name: "Espresso",               description: "Double shot",                                            categoryId: cid("Soft Drinks"),     price: "3.50",  department: "bar",     available: true, preparationTime: 3 },
      { name: "Cappuccino",             description: "Espresso with steamed milk foam",                        categoryId: cid("Soft Drinks"),     price: "4.50",  department: "bar",     available: true, preparationTime: 4 },
      { name: "Draft Lager Pint",       description: "House draft lager 568ml",                               categoryId: cid("Beer & Cider"),    price: "6.00",  department: "bar",     available: true, preparationTime: 2 },
      { name: "Draft IPA Pint",         description: "Hoppy craft IPA on draft 568ml",                        categoryId: cid("Beer & Cider"),    price: "6.50",  department: "bar",     available: true, preparationTime: 2 },
      { name: "Peroni Nastro Azzurro",  description: "330ml bottle",                                          categoryId: cid("Beer & Cider"),    price: "5.00",  department: "bar",     available: true, preparationTime: 1 },
      { name: "Corona Extra",           description: "330ml bottle with lime",                                 categoryId: cid("Beer & Cider"),    price: "5.00",  department: "bar",     available: true, preparationTime: 1 },
      { name: "House Red Wine Glass",   description: "Montepulciano d'Abruzzo, 175ml",                        categoryId: cid("Wine"),            price: "7.00",  department: "bar",     available: true, preparationTime: 1 },
      { name: "House White Wine Glass", description: "Pinot Grigio delle Venezie, 175ml",                     categoryId: cid("Wine"),            price: "7.00",  department: "bar",     available: true, preparationTime: 1 },
      { name: "Prosecco Glass",         description: "Treviso DOC, 125ml",                                    categoryId: cid("Wine"),            price: "8.50",  department: "bar",     available: true, preparationTime: 1 },
      { name: "Bottle Barolo",          description: "Barolo DOCG 2019, 750ml",                               categoryId: cid("Wine"),            price: "52.00", department: "bar",     available: true, preparationTime: 2 },
      { name: "Aperol Spritz",          description: "Aperol, Prosecco, soda, orange slice",                  categoryId: cid("Cocktails"),       price: "11.00", department: "bar",     available: true, preparationTime: 4 },
      { name: "Negroni",                description: "Campari, sweet vermouth, gin",                          categoryId: cid("Cocktails"),       price: "12.00", department: "bar",     available: true, preparationTime: 4 },
      { name: "Espresso Martini",       description: "Vodka, Kahlua, fresh espresso, sugar syrup",            categoryId: cid("Cocktails"),       price: "13.00", department: "bar",     available: true, preparationTime: 5 },
      { name: "Mojito",                 description: "Rum, lime, mint, soda, sugar",                          categoryId: cid("Cocktails"),       price: "12.00", department: "bar",     available: true, preparationTime: 5 },
      { name: "Margarita",              description: "Tequila, triple sec, fresh lime, salt rim",             categoryId: cid("Cocktails"),       price: "12.00", department: "bar",     available: true, preparationTime: 4 },
      { name: "Hendrick's Gin 50ml",    description: "With fever-tree tonic and cucumber",                    categoryId: cid("Spirits"),         price: "11.00", department: "bar",     available: true, preparationTime: 2 },
      { name: "Johnnie Walker Black",   description: "Blended Scotch whisky, 50ml",                           categoryId: cid("Spirits"),         price: "9.50",  department: "bar",     available: true, preparationTime: 1 },
      { name: "Grey Goose Vodka 50ml",  description: "French premium vodka",                                  categoryId: cid("Spirits"),         price: "10.00", department: "bar",     available: true, preparationTime: 1 },
    ]);
    console.log("Menu seeded.");
  }

  const existingCustomers = await db.select().from(customersTable);
  if (existingCustomers.length === 0) {
    await db.insert(customersTable).values([
      { name: "James Anderson",  phone: "+1-555-1001", email: "james.anderson@email.com", visitCount: 14, totalSpent: "420.50", notes: "Allergic to nuts" },
      { name: "Sarah Williams",  phone: "+1-555-1002", email: "sarah.w@email.com",        visitCount: 8,  totalSpent: "195.00" },
      { name: "Marco Rossi",     phone: "+1-555-1003", email: "marco.rossi@email.com",    visitCount: 22, totalSpent: "890.00", notes: "Prefers window table" },
      { name: "Emma Clarke",     phone: "+1-555-1004", email: "emma.c@email.com",         visitCount: 3,  totalSpent: "67.50" },
      { name: "David Kim",       phone: "+1-555-1005",                                    visitCount: 5,  totalSpent: "156.00" },
      { name: "Sofia Rodriguez", phone: "+1-555-1006", email: "sofia.r@email.com",        visitCount: 11, totalSpent: "312.00", notes: "Vegetarian" },
      { name: "Oliver Brown",    phone: "+1-555-1007", email: "oliver.b@email.com",       visitCount: 1,  totalSpent: "42.00" },
      { name: "Yuki Tanaka",     phone: "+1-555-1008", email: "yuki.t@email.com",         visitCount: 7,  totalSpent: "231.50" },
    ]);
    console.log("Customers seeded.");
  }

  const existingReservations = await db.select().from(reservationsTable);
  if (existingReservations.length === 0) {
    const today = new Date().toISOString().slice(0, 10);
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    await db.insert(reservationsTable).values([
      { customerName: "Marco Rossi",    customerPhone: "+1-555-1003", customerEmail: "marco.rossi@email.com", guestCount: 2, date: today,    time: "12:30", status: "confirmed", notes: "Anniversary dinner" },
      { customerName: "Sarah Williams", customerPhone: "+1-555-1002", customerEmail: "sarah.w@email.com",     guestCount: 4, date: today,    time: "13:00", status: "seated" },
      { customerName: "James Anderson", customerPhone: "+1-555-1001", customerEmail: "james@email.com",       guestCount: 2, date: today,    time: "19:00", status: "confirmed", notes: "Nut allergy - important!" },
      { customerName: "Emma Clarke",    customerPhone: "+1-555-1004",                                         guestCount: 3, date: today,    time: "20:00", status: "pending" },
      { customerName: "Smith Family",   customerPhone: "+1-555-2001",                                         guestCount: 6, date: tomorrow, time: "12:00", status: "confirmed" },
      { customerName: "Yuki Tanaka",    customerPhone: "+1-555-1008", customerEmail: "yuki.t@email.com",      guestCount: 2, date: tomorrow, time: "19:30", status: "pending" },
    ]);
    console.log("Reservations seeded.");
  }

  const existingInventory = await db.select().from(inventoryItemsTable);
  if (existingInventory.length === 0) {
    await db.insert(inventoryItemsTable).values([
      { name: "Chicken Breast",         unit: "kg",    currentStock: "12.5",  minimumStock: "5.0",  supplier: "Metro Foods",       costPrice: "8.50" },
      { name: "Beef Ribeye",            unit: "kg",    currentStock: "4.2",   minimumStock: "3.0",  supplier: "Premium Meats",     costPrice: "22.00" },
      { name: "Atlantic Salmon",        unit: "kg",    currentStock: "2.8",   minimumStock: "4.0",  supplier: "Ocean Fresh",       costPrice: "15.00" },
      { name: "All-Purpose Flour",      unit: "kg",    currentStock: "25.0",  minimumStock: "10.0", supplier: "Bakery Depot",      costPrice: "1.20" },
      { name: "San Marzano Tomato",     unit: "kg",    currentStock: "8.0",   minimumStock: "3.0",  supplier: "Italian Imports",   costPrice: "4.50" },
      { name: "Mozzarella",             unit: "kg",    currentStock: "6.5",   minimumStock: "3.0",  supplier: "Dairy Direct",      costPrice: "9.00" },
      { name: "Parmigiano Reggiano",    unit: "kg",    currentStock: "2.0",   minimumStock: "1.5",  supplier: "Italian Imports",   costPrice: "28.00" },
      { name: "Extra Virgin Olive Oil", unit: "liter", currentStock: "7.5",   minimumStock: "3.0",  supplier: "Mediterranean Co",  costPrice: "12.00" },
      { name: "Pasta - Spaghetti",      unit: "kg",    currentStock: "15.0",  minimumStock: "5.0",  supplier: "Pasta Co",          costPrice: "2.00" },
      { name: "Arborio Rice",           unit: "kg",    currentStock: "8.0",   minimumStock: "3.0",  supplier: "Italian Imports",   costPrice: "3.50" },
      { name: "Heavy Cream",            unit: "liter", currentStock: "5.0",   minimumStock: "2.0",  supplier: "Dairy Direct",      costPrice: "3.00" },
      { name: "Eggs",                   unit: "pcs",   currentStock: "120",   minimumStock: "48",   supplier: "Farm Fresh",        costPrice: "0.35" },
      { name: "Lemons",                 unit: "pcs",   currentStock: "30",    minimumStock: "20",   supplier: "Produce Plus",      costPrice: "0.50" },
      { name: "Fresh Basil",            unit: "g",     currentStock: "150",   minimumStock: "100",  supplier: "Herb Garden",       costPrice: "0.05" },
      { name: "Aperol",                 unit: "liter", currentStock: "3.5",   minimumStock: "2.0",  supplier: "Spirits Wholesale", costPrice: "18.00" },
      { name: "Prosecco",               unit: "liter", currentStock: "6.0",   minimumStock: "3.0",  supplier: "Wine & More",       costPrice: "8.00" },
      { name: "Draft Lager",            unit: "liter", currentStock: "40.0",  minimumStock: "20.0", supplier: "Brewery Direct",    costPrice: "1.50" },
      { name: "Grey Goose Vodka",       unit: "liter", currentStock: "1.5",   minimumStock: "1.0",  supplier: "Spirits Wholesale", costPrice: "35.00" },
      { name: "Napkins",                unit: "pcs",   currentStock: "500",   minimumStock: "200",  supplier: "Restaurant Supply", costPrice: "0.03" },
      { name: "Takeaway Boxes",         unit: "pcs",   currentStock: "80",    minimumStock: "100",  supplier: "Restaurant Supply", costPrice: "0.25" },
    ]);
    console.log("Inventory seeded.");
  }

  const existingNotifications = await db.select().from(notificationsTable);
  if (existingNotifications.length === 0) {
    await db.insert(notificationsTable).values([
      { type: "inventory:low_stock", message: "Atlantic Salmon is below minimum stock level",    targetRole: "inventory_manager", read: false },
      { type: "inventory:low_stock", message: "Takeaway Boxes are below minimum stock level",   targetRole: "inventory_manager", read: false },
      { type: "reservation:created", message: "New reservation: James Anderson tonight at 19:00", targetRole: "receptionist",   read: false },
      { type: "kitchen:item_ready",  message: "Bruschetta al Pomodoro ready for Table 6",        targetRole: "waiter",          read: false },
      { type: "bill:requested",      message: "Bill requested for Table 9",                      targetRole: "cashier",         read: false },
      { type: "payment:completed",   message: "Payment of $87.50 received for Order #1",         targetRole: "manager",         read: true },
    ]);
    console.log("Notifications seeded.");
  }

  console.log("Seed complete!");
  process.exit(0);
}

seed().catch(err => {
  console.error("Seed failed:", err);
  process.exit(1);
});
