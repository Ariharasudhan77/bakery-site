export const MENU = [
  { id: 1, name: "Sourdough loaf", cat: "Bread", price: 320, icon: "🍞", image: "/images/sourdough-loaf.jpg", note: "Long ferment, blistered crust, soft open crumb." },
  { id: 2, name: "Rye & seed", cat: "Bread", price: 280, icon: "🌾", image: "/images/rye-seed.jpg", note: "Dense, nutty and packed with sunflower and flax." },
  { id: 3, name: "Milk buns (6)", cat: "Bread", price: 150, icon: "🥯", image: "/images/milk-buns.jpg", note: "Pillowy buns brushed with warm butter." },
  { id: 4, name: "Butter croissant", cat: "Pastry", price: 110, icon: "🥐", image: "/images/butter-croissant.jpg", note: "Laminated by hand, 27 layers, shatteringly crisp." },
  { id: 5, name: "Pistachio danish", cat: "Pastry", price: 160, icon: "🥮", image: "/images/pistachio-danish.jpg", note: "Custard, crushed pistachio and a sugar glaze." },
  { id: 6, name: "Cardamom knot", cat: "Pastry", price: 130, icon: "🌀", image: "/images/cardamom-knot.jpg", note: "Twisted dough with cardamom sugar in every fold." },
  { id: 7, name: "Banana walnut loaf", cat: "Cakes", price: 240, icon: "🍌", image: "/images/banana-walnut-loaf.jpg", note: "Moist, spiced with cinnamon, topped with walnuts." },
  { id: 8, name: "Dark chocolate tart", cat: "Cakes", price: 190, icon: "🍫", image: "/images/dark-chocolate-tart.jpg", note: "Crisp shell, glossy ganache, a pinch of sea salt." },
];

export const OVEN = [
  { h: 6.5, label: "6:30 am", item: "Sourdough loaves" },
  { h: 7.25, label: "7:15 am", item: "Butter croissants" },
  { h: 9, label: "9:00 am", item: "Cardamom knots" },
  { h: 11.5, label: "11:30 am", item: "Milk buns" },
  { h: 15, label: "3:00 pm", item: "Chocolate tarts" },
];

// Opening rules used by the chatbot server (hours are decimals: 6.5 = 6:30 am, 20 = 8:00 pm)
export const STORE = { openHour: 6.5, closeHour: 20, closedDay: 1, orderCutoff: 18 }; // closedDay 1 = Monday
