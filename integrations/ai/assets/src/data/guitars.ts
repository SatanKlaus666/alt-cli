export interface Guitar {
  id: number
  name: string
  image: string
  description: string
  shortDescription: string
  price: number
}

const guitars: Array<Guitar> = [
  {
    id: 1,
    name: 'TanStack Ukelele',
    image: '/example-ukelele-tanstack.jpg',
    description:
      "Introducing the TanStack Signature Ukulele—a beautifully handcrafted concert ukulele that combines exceptional sound quality with distinctive style. Featuring a warm, resonant koa-wood body with natural grain patterns, this instrument delivers the rich, mellow tones Hawaii is famous for.",
    shortDescription:
      'Premium koa-wood ukulele featuring exclusive TanStack branding, perfect for beach vibes and island-inspired melodies.',
    price: 299,
  },
  {
    id: 2,
    name: 'Video Game Guitar',
    image: '/example-guitar-video-games.jpg',
    description:
      "The Video Game Guitar is a unique acoustic guitar that features a design inspired by video games. It has a sleek, high-gloss finish and a comfortable playability.",
    shortDescription:
      'A unique electric guitar with a video game design, high-gloss finish, and comfortable playability.',
    price: 699,
  },
  {
    id: 3,
    name: 'Superhero Guitar',
    image: '/example-guitar-superhero.jpg',
    description:
      "The Superhero Guitar is a bold black electric guitar that stands out with its unique superhero logo design. Its sleek, high-gloss finish and powerful pickups make it perfect for high-energy performances.",
    shortDescription:
      'A bold black electric guitar with a unique superhero logo, high-gloss finish, and powerful pickups.',
    price: 699,
  },
  {
    id: 4,
    name: 'Motherboard Guitar',
    image: '/example-guitar-motherboard.jpg',
    description:
      "This guitar is a tribute to the motherboard of a computer. The intricate circuit-inspired design features actual LED lights that pulse with your playing intensity.",
    shortDescription:
      'A tech-inspired electric guitar featuring LED lights and binary code inlays that glow under stage lights.',
    price: 649,
  },
  {
    id: 5,
    name: 'Racing Guitar',
    image: '/example-guitar-racing.jpg',
    description:
      "Engineered for speed and precision, the Racing Guitar embodies the spirit of motorsport in every curve and contour. Its aerodynamic body is painted in classic racing stripes.",
    shortDescription:
      'A lightweight, aerodynamic guitar with racing stripes and a low-action setup designed for speed and precision.',
    price: 679,
  },
  {
    id: 6,
    name: 'Steamer Trunk Guitar',
    image: '/example-guitar-steamer-trunk.jpg',
    description:
      'The Steamer Trunk Guitar is a semi-hollow body instrument that exudes vintage charm and character. Crafted from reclaimed antique luggage wood.',
    shortDescription:
      'A semi-hollow body guitar with brass hardware and a world map inlay, crafted from reclaimed antique luggage wood.',
    price: 629,
  },
  {
    id: 7,
    name: "Travelin' Man Guitar",
    image: '/example-guitar-traveling.jpg',
    description:
      "The Travelin' Man Guitar is an acoustic masterpiece adorned with vintage postcards from around the world. Each postcard tells a story of adventure and wanderlust.",
    shortDescription:
      'An acoustic guitar with vintage postcards, rich tones, and comfortable playability.',
    price: 499,
  },
  {
    id: 8,
    name: 'Flowerly Love Guitar',
    image: '/example-guitar-flowers.jpg',
    description:
      "The Flowerly Love Guitar is an acoustic masterpiece adorned with intricate floral designs on its body. Each flower is hand-painted.",
    shortDescription:
      'An acoustic guitar with hand-painted floral designs and warm, resonant tones.',
    price: 599,
  },
]

export default guitars
