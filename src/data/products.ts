// Central product database. Every price is a whole number of rupees so all
// arithmetic in the learning engine stays exact.

export type DepartmentId =
  | 'fruits-veg'
  | 'dairy'
  | 'bakery'
  | 'beverages'
  | 'snacks'
  | 'household'
  | 'grocery'

export type FoodGroup = 'fruit' | 'vegetable' | 'dairy' | 'grain' | 'protein' | 'drink' | 'treat' | 'non-food'
export type HealthTag = 'everyday' | 'sometimes' | 'non-food'

export type ModelShape =
  | 'sphere' | 'banana' | 'mango' | 'grapes' | 'carrot' | 'cabbage' | 'onion'
  | 'bottle' | 'carton' | 'box' | 'bag' | 'tub' | 'bar' | 'tube' | 'loaf' | 'cake' | 'bun' | 'croissant' | 'coconut' | 'jar'

export interface ProductModel {
  shape: ModelShape
  color: string
  accent?: string
  /** Rough size in metres (largest dimension). */
  size: number
}

export interface Product {
  id: string
  name: string
  department: DepartmentId
  price: number
  /** Human label for the pack, e.g. "1 kg", "500 g", "1 piece". */
  unit: string
  /** Pack quantity in base units, used for price-per-unit comparison. */
  quantity: { amount: number; base: 'g' | 'ml' | 'piece' }
  model: ProductModel
  /** 2D image used by panels and quizzes. */
  image: string
  info: string
  foodGroup: FoodGroup
  health: HealthTag
  barcode: string
}

export interface Department {
  id: DepartmentId
  name: string
  color: string
  icon: string
}

export const DEPARTMENTS: Department[] = [
  { id: 'fruits-veg', name: 'Fruits & Vegetables', color: '#3fb950', icon: '🥕' },
  { id: 'dairy', name: 'Dairy', color: '#4c9aff', icon: '🥛' },
  { id: 'bakery', name: 'Bakery', color: '#e8a33d', icon: '🍞' },
  { id: 'beverages', name: 'Beverages', color: '#20b2aa', icon: '🧃' },
  { id: 'snacks', name: 'Snacks', color: '#f25f8f', icon: '🍿' },
  { id: 'household', name: 'Household', color: '#8b6cf6', icon: '🧼' },
  { id: 'grocery', name: 'Grocery', color: '#d9822b', icon: '🌾' },
]

let seq = 0
const p = (
  id: string,
  name: string,
  department: DepartmentId,
  price: number,
  unit: string,
  quantity: Product['quantity'],
  model: ProductModel,
  image: string,
  foodGroup: FoodGroup,
  health: HealthTag,
  info: string,
): Product => ({
  id, name, department, price, unit, quantity, model, image, foodGroup, health, info,
  barcode: `890${String(1000 + ++seq * 37).padStart(6, '0')}`,
})

export const PRODUCTS: Product[] = [
  // Fruits & vegetables
  p('apple', 'Apple', 'fruits-veg', 20, '1 piece', { amount: 1, base: 'piece' }, { shape: 'sphere', color: '#e53935', size: 0.09 }, '🍎', 'fruit', 'everyday', 'Apples are crunchy and full of fibre. An apple a day keeps you strong!'),
  p('banana', 'Banana', 'fruits-veg', 5, '1 piece', { amount: 1, base: 'piece' }, { shape: 'banana', color: '#ffd23f', size: 0.18 }, '🍌', 'fruit', 'everyday', 'Bananas give quick energy and have potassium for healthy muscles.'),
  p('orange', 'Orange', 'fruits-veg', 15, '1 piece', { amount: 1, base: 'piece' }, { shape: 'sphere', color: '#fb8c00', size: 0.09 }, '🍊', 'fruit', 'everyday', 'Oranges are rich in Vitamin C, which helps you fight colds.'),
  p('mango', 'Mango', 'fruits-veg', 30, '1 piece', { amount: 1, base: 'piece' }, { shape: 'mango', color: '#ffb300', accent: '#7cb342', size: 0.12 }, '🥭', 'fruit', 'everyday', 'Mango is called the king of fruits in India. Sweet and juicy!'),
  p('grapes', 'Grapes', 'fruits-veg', 60, '500 g', { amount: 500, base: 'g' }, { shape: 'grapes', color: '#7b1fa2', size: 0.14 }, '🍇', 'fruit', 'everyday', 'Grapes grow in bunches. Green and black grapes are both tasty.'),
  p('tomato', 'Tomato', 'fruits-veg', 20, '500 g', { amount: 500, base: 'g' }, { shape: 'sphere', color: '#d32f2f', accent: '#2e7d32', size: 0.07 }, '🍅', 'vegetable', 'everyday', 'Tomatoes are used in curries, chutneys and salads.'),
  p('potato', 'Potato', 'fruits-veg', 30, '1 kg', { amount: 1000, base: 'g' }, { shape: 'sphere', color: '#b08850', size: 0.08 }, '🥔', 'vegetable', 'everyday', 'Potatoes grow under the ground and give us energy.'),
  p('onion', 'Onion', 'fruits-veg', 40, '1 kg', { amount: 1000, base: 'g' }, { shape: 'onion', color: '#a0446b', size: 0.08 }, '🧅', 'vegetable', 'everyday', 'Onions have layers. They can make your eyes water when you cut them!'),
  p('carrot', 'Carrot', 'fruits-veg', 25, '500 g', { amount: 500, base: 'g' }, { shape: 'carrot', color: '#ff7043', accent: '#43a047', size: 0.16 }, '🥕', 'vegetable', 'everyday', 'Carrots have Vitamin A, which is good for your eyes.'),
  p('cabbage', 'Cabbage', 'fruits-veg', 30, '1 piece', { amount: 1, base: 'piece' }, { shape: 'cabbage', color: '#8bc34a', size: 0.15 }, '🥬', 'vegetable', 'everyday', 'Cabbage is a leafy vegetable. It is crunchy in salads.'),

  // Dairy
  p('milk', 'Milk', 'dairy', 30, '1 litre', { amount: 1000, base: 'ml' }, { shape: 'carton', color: '#ffffff', accent: '#1e88e5', size: 0.22 }, '🥛', 'dairy', 'everyday', 'Milk has calcium that makes your bones and teeth strong.'),
  p('butter', 'Butter', 'dairy', 55, '100 g', { amount: 100, base: 'g' }, { shape: 'bar', color: '#fff176', accent: '#f9a825', size: 0.11 }, '🧈', 'dairy', 'sometimes', 'Butter is made by churning cream. Use a little on your toast.'),
  p('cheese', 'Cheese', 'dairy', 120, '200 g', { amount: 200, base: 'g' }, { shape: 'box', color: '#ffca28', accent: '#e65100', size: 0.12 }, '🧀', 'dairy', 'everyday', 'Cheese is made from milk and has protein and calcium.'),
  p('paneer', 'Paneer', 'dairy', 90, '200 g', { amount: 200, base: 'g' }, { shape: 'box', color: '#fafafa', accent: '#43a047', size: 0.12 }, '🧊', 'protein', 'everyday', 'Paneer is Indian cottage cheese. It is great in paneer tikka!'),
  p('curd', 'Curd', 'dairy', 40, '400 g', { amount: 400, base: 'g' }, { shape: 'tub', color: '#ffffff', accent: '#e53935', size: 0.11 }, '🥣', 'dairy', 'everyday', 'Curd (dahi) is good for your tummy and keeps you cool.'),
  p('yogurt', 'Yogurt', 'dairy', 20, '100 g', { amount: 100, base: 'g' }, { shape: 'tub', color: '#f8bbd0', accent: '#ad1457', size: 0.07 }, '🍨', 'dairy', 'everyday', 'Fruit yogurt is curd mixed with fruit. A yummy snack.'),

  // Bakery
  p('bread', 'Bread', 'bakery', 25, '1 packet', { amount: 1, base: 'piece' }, { shape: 'loaf', color: '#d7a25e', accent: '#e3f2fd', size: 0.26 }, '🍞', 'grain', 'everyday', 'Bread is made from wheat flour. Brown bread has more fibre.'),
  p('cake', 'Cake', 'bakery', 150, '500 g', { amount: 500, base: 'g' }, { shape: 'cake', color: '#f48fb1', accent: '#6d4c41', size: 0.2 }, '🎂', 'treat', 'sometimes', 'Cake is a treat for birthdays and celebrations.'),
  p('biscuits', 'Biscuits', 'bakery', 10, '1 packet', { amount: 1, base: 'piece' }, { shape: 'bar', color: '#ff8f00', accent: '#5d4037', size: 0.15 }, '🍘', 'treat', 'sometimes', 'Biscuits go well with milk. Enjoy a few at a time.'),
  p('bun', 'Bun', 'bakery', 10, '1 piece', { amount: 1, base: 'piece' }, { shape: 'bun', color: '#e0a458', size: 0.1 }, '🥯', 'grain', 'everyday', 'A soft bun is used for burgers and pav bhaji.'),
  p('croissant', 'Croissant', 'bakery', 45, '1 piece', { amount: 1, base: 'piece' }, { shape: 'croissant', color: '#d4943a', size: 0.15 }, '🥐', 'treat', 'sometimes', 'A croissant is a flaky French bread shaped like a moon.'),

  // Beverages
  p('water', 'Water', 'beverages', 20, '1 litre', { amount: 1000, base: 'ml' }, { shape: 'bottle', color: '#81d4fa', accent: '#0277bd', size: 0.26 }, '💧', 'drink', 'everyday', 'Water is the best drink. Drink 6–8 glasses every day!'),
  p('juice', 'Juice', 'beverages', 110, '1 litre', { amount: 1000, base: 'ml' }, { shape: 'carton', color: '#ffa726', accent: '#2e7d32', size: 0.22 }, '🧃', 'drink', 'sometimes', 'Fruit juice has vitamins but also sugar. Whole fruit is even better.'),
  p('milkshake', 'Milkshake', 'beverages', 35, '200 ml', { amount: 200, base: 'ml' }, { shape: 'bottle', color: '#f06292', accent: '#880e4f', size: 0.16 }, '🥤', 'treat', 'sometimes', 'Milkshake is milk blended with fruit or chocolate. A sweet treat.'),
  p('coconut-water', 'Coconut Water', 'beverages', 40, '1 piece', { amount: 1, base: 'piece' }, { shape: 'coconut', color: '#7cb342', accent: '#5d4037', size: 0.16 }, '🥥', 'drink', 'everyday', 'Coconut water is natural and refreshing on a hot day.'),

  // Snacks
  p('chips', 'Chips', 'snacks', 20, '1 packet', { amount: 1, base: 'piece' }, { shape: 'bag', color: '#fdd835', accent: '#d32f2f', size: 0.2 }, '🍟', 'treat', 'sometimes', 'Chips are salty and fried. A sometimes snack!'),
  p('chocolate', 'Chocolate', 'snacks', 40, '1 bar', { amount: 1, base: 'piece' }, { shape: 'bar', color: '#6d4c41', accent: '#ffd54f', size: 0.14 }, '🍫', 'treat', 'sometimes', 'Chocolate is made from cocoa beans. Sweet, so enjoy a little.'),
  p('cookies', 'Cookies', 'snacks', 30, '1 packet', { amount: 1, base: 'piece' }, { shape: 'box', color: '#8d6e63', accent: '#ffecb3', size: 0.14 }, '🍪', 'treat', 'sometimes', 'Cookies are baked treats with chocolate chips or nuts.'),
  p('popcorn', 'Popcorn', 'snacks', 50, '1 packet', { amount: 1, base: 'piece' }, { shape: 'bag', color: '#e53935', accent: '#fff8e1', size: 0.2 }, '🍿', 'grain', 'sometimes', 'Popcorn is made from corn kernels that pop when heated!'),

  // Household
  p('soap', 'Soap', 'household', 35, '1 bar', { amount: 1, base: 'piece' }, { shape: 'box', color: '#80deea', accent: '#00838f', size: 0.09 }, '🧼', 'non-food', 'non-food', 'Wash your hands with soap for 20 seconds to remove germs.'),
  p('shampoo', 'Shampoo', 'household', 120, '200 ml', { amount: 200, base: 'ml' }, { shape: 'bottle', color: '#ce93d8', accent: '#6a1b9a', size: 0.2 }, '🧴', 'non-food', 'non-food', 'Shampoo keeps your hair clean and shiny.'),
  p('toothpaste', 'Toothpaste', 'household', 95, '150 g', { amount: 150, base: 'g' }, { shape: 'tube', color: '#ffffff', accent: '#e53935', size: 0.18 }, '🪥', 'non-food', 'non-food', 'Brush your teeth twice a day – morning and night!'),
  p('detergent', 'Detergent', 'household', 110, '1 kg', { amount: 1000, base: 'g' }, { shape: 'box', color: '#1e88e5', accent: '#ffeb3b', size: 0.22 }, '🫧', 'non-food', 'non-food', 'Detergent powder is used to wash clothes.'),

  // Grocery
  p('rice', 'Rice', 'grocery', 60, '1 kg', { amount: 1000, base: 'g' }, { shape: 'bag', color: '#fafafa', accent: '#2e7d32', size: 0.24 }, '🍚', 'grain', 'everyday', 'Rice is eaten every day across India – with dal, curd or sambar.'),
  p('wheat-flour', 'Wheat Flour', 'grocery', 45, '1 kg', { amount: 1000, base: 'g' }, { shape: 'bag', color: '#ffe0b2', accent: '#e65100', size: 0.24 }, '🌾', 'grain', 'everyday', 'Wheat flour (atta) is used to make rotis and chapatis.'),
  p('sugar', 'Sugar', 'grocery', 45, '1 kg', { amount: 1000, base: 'g' }, { shape: 'bag', color: '#ffffff', accent: '#1565c0', size: 0.22 }, '🍬', 'treat', 'sometimes', 'Sugar makes food sweet. Too much is not good for your teeth.'),
  p('salt', 'Salt', 'grocery', 25, '1 kg', { amount: 1000, base: 'g' }, { shape: 'bag', color: '#e3f2fd', accent: '#c62828', size: 0.2 }, '🧂', 'non-food', 'sometimes', 'Salt adds taste. We need only a little every day.'),
  p('dal', 'Dal', 'grocery', 120, '1 kg', { amount: 1000, base: 'g' }, { shape: 'bag', color: '#ffd54f', accent: '#6d4c41', size: 0.22 }, '🫘', 'protein', 'everyday', 'Dal (lentils) is full of protein to help you grow.'),
  p('cooking-oil', 'Cooking Oil', 'grocery', 150, '1 litre', { amount: 1000, base: 'ml' }, { shape: 'bottle', color: '#ffe082', accent: '#f57f17', size: 0.28 }, '🫗', 'non-food', 'sometimes', 'Oil is used for cooking. A small amount is enough.'),
]

export const PRODUCT_BY_ID: Record<string, Product> = Object.fromEntries(PRODUCTS.map((x) => [x.id, x]))

export const productsIn = (dept: DepartmentId) => PRODUCTS.filter((x) => x.department === dept)

export const getProduct = (id: string): Product => {
  const product = PRODUCT_BY_ID[id]
  if (!product) throw new Error(`Unknown product: ${id}`)
  return product
}

export const departmentOf = (id: DepartmentId) => DEPARTMENTS.find((d) => d.id === id)!
