const appData = {
    hospital: [
        { id: 'h1', name: 'Norvic International Hospital', location: 'Thapathali, Kathmandu', rating: 4.5, image: 'https://images.unsplash.com/photo-1587351021759-3e566b6c4215?q=80&w=200&auto=format&fit=crop' },
        { id: 'h2', name: 'Grande International Hospital', location: 'Dhapasi, Kathmandu', rating: 4.7, image: 'https://images.unsplash.com/photo-1586773860418-d37222d8fce3?q=80&w=200&auto=format&fit=crop' },
        { id: 'h3', name: 'Nepal Mediciti Hospital', location: 'Bhaisepati, Lalitpur', rating: 4.8, image: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?q=80&w=200&auto=format&fit=crop' },
        { id: 'h4', name: 'Bir Hospital', location: 'Mahaboudha, Kathmandu', rating: 3.8, image: 'https://images.unsplash.com/photo-1632833239869-a37e3a5806d2?q=80&w=200&auto=format&fit=crop' },
        { id: 'h5', name: 'Alka Hospital', location: 'Jawalakhel, Lalitpur', rating: 4.2, image: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?q=80&w=200&auto=format&fit=crop' },
        { id: 'h6', name: 'Om Hospital', location: 'Chabahil, Kathmandu', rating: 4.3, image: 'https://images.unsplash.com/photo-1538108149393-fbbd81895907?q=80&w=200&auto=format&fit=crop' },
        { id: 'h7', name: 'KIST Medical College', location: 'Imadol, Lalitpur', rating: 4.0, image: 'https://images.unsplash.com/photo-1512678080530-7760d81faba6?q=80&w=200&auto=format&fit=crop' },
        { id: 'h8', name: 'Teaching Hospital (TUTH)', location: 'Maharajgunj, Kathmandu', rating: 4.4, image: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?q=80&w=200&auto=format&fit=crop' },
        { id: 'h9', name: 'B&B Hospital', location: 'Gwarko, Lalitpur', rating: 4.3, image: 'https://images.unsplash.com/photo-1516574187841-693018f54746?q=80&w=200&auto=format&fit=crop' },
        { id: 'h10', name: 'Civil Service Hospital', location: 'Minbhawan, Kathmandu', rating: 4.1, image: 'https://images.unsplash.com/photo-1516549655169-df83a0774514?q=80&w=200&auto=format&fit=crop' }
    ],
    dental: [
        { id: 'd1', name: 'Samaj Dental Hospital', location: 'New Baneshwor, Kathmandu', rating: 4.6, image: 'https://images.unsplash.com/photo-1606811971618-4486d14f3f99?q=80&w=200&auto=format&fit=crop' },
        { id: 'd2', name: 'Kathmandu Dental Home', location: 'Jamal, Kathmandu', rating: 4.3, image: 'https://images.unsplash.com/photo-1609840114035-1c2d6630985c?q=80&w=200&auto=format&fit=crop' },
        { id: 'd3', name: 'Kantipur Dental Hospital', location: 'Maharajgunj, Kathmandu', rating: 4.2, image: 'https://images.unsplash.com/photo-1588776814546-1ffcf4722e12?q=80&w=200&auto=format&fit=crop' },
        { id: 'd4', name: 'Smile Nepal Dental', location: 'Pulchowk, Lalitpur', rating: 4.8, image: 'https://images.unsplash.com/photo-1600170457229-1c64dfc43315?q=80&w=200&auto=format&fit=crop' },
        { id: 'd5', name: 'Om Samaj Dental', location: 'Chabahil, Kathmandu', rating: 4.4, image: 'https://images.unsplash.com/photo-1598256989800-fe5b8c38622f?q=80&w=200&auto=format&fit=crop' },
        { id: 'd6', name: 'Shangrila Dental', location: 'Bhatbhateni, Kathmandu', rating: 4.5, image: 'https://images.unsplash.com/photo-1598256989481-8636f2f28b7e?q=80&w=200&auto=format&fit=crop' },
        { id: 'd7', name: 'Dental Villa', location: 'Lazimpat, Kathmandu', rating: 4.6, image: 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?q=80&w=200&auto=format&fit=crop' },
        { id: 'd8', name: 'Healthy Smiles', location: 'Jhamsikhel, Lalitpur', rating: 4.7, image: 'https://images.unsplash.com/photo-1571772996211-462f9ea5b5d6?q=80&w=200&auto=format&fit=crop' },
        { id: 'd9', name: 'People\'s Dental College', location: 'Nayabazar, Kathmandu', rating: 4.0, image: 'https://images.unsplash.com/photo-1606811893175-a0f1a4af6c07?q=80&w=200&auto=format&fit=crop' },
        { id: 'd10', name: 'Advanced Dental Care', location: 'Baluwatar, Kathmandu', rating: 4.5, image: 'https://images.unsplash.com/photo-1629909615184-74f495363b67?q=80&w=200&auto=format&fit=crop' }
    ],
    saloon: [
        { id: 's1', name: 'The Barber Shop Nepal', location: 'Jhamsikhel, Lalitpur', rating: 4.7, image: 'https://images.unsplash.com/photo-1503951914875-befbb711ed3e?q=80&w=200&auto=format&fit=crop' },
        { id: 's2', name: 'Hair & Shanti', location: 'Multiple Locations', rating: 4.5, image: 'https://images.unsplash.com/photo-1582095133179-bfd08d2fc6b2?q=80&w=200&auto=format&fit=crop' },
        { id: 's3', name: 'K-Town Barbers', location: 'Naxal, Kathmandu', rating: 4.6, image: 'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?q=80&w=200&auto=format&fit=crop' },
        { id: 's4', name: 'Uptown Barbers', location: 'Durbarmarg, Kathmandu', rating: 4.8, image: 'https://images.unsplash.com/photo-1593702295094-aea22597af65?q=80&w=200&auto=format&fit=crop' },
        { id: 's5', name: 'Gentleman\'s Lounge', location: 'Baluwatar, Kathmandu', rating: 4.4, image: 'https://images.unsplash.com/photo-1599351431202-1e0f013d964f?q=80&w=200&auto=format&fit=crop' },
        { id: 's6', name: 'Scissors Salon', location: 'Kumaripati, Lalitpur', rating: 4.2, image: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?q=80&w=200&auto=format&fit=crop' },
        { id: 's7', name: 'Royal Hair Salon', location: 'Kalimati, Kathmandu', rating: 4.0, image: 'https://images.unsplash.com/photo-1534353457116-3a7bc37c2293?q=80&w=200&auto=format&fit=crop' },
        { id: 's8', name: 'Classic Cuts', location: 'Putalisadak, Kathmandu', rating: 4.1, image: 'https://images.unsplash.com/photo-1634302086887-13b5666f2928?q=80&w=200&auto=format&fit=crop' },
        { id: 's9', name: 'New Look Salon', location: 'Koteshwor, Kathmandu', rating: 3.9, image: 'https://images.unsplash.com/photo-1512690459411-b9245aed6191?q=80&w=200&auto=format&fit=crop' },
        { id: 's10', name: 'Style Station', location: 'Baneshwor, Kathmandu', rating: 4.3, image: 'https://images.unsplash.com/photo-1517832606299-7ae9b720a186?q=80&w=200&auto=format&fit=crop' }
    ],
    parlour: [
        { id: 'p1', name: 'Face & Fuss', location: 'Bhatbhateni, Kathmandu', rating: 4.6, image: 'https://images.unsplash.com/photo-1560066984-138fae6e5e3b?q=80&w=200&auto=format&fit=crop' },
        { id: 'p2', name: 'Glambar', location: 'Durbarmarg, Kathmandu', rating: 4.8, image: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?q=80&w=200&auto=format&fit=crop' },
        { id: 'p3', name: 'Neel David\'s', location: 'Multiple Locations', rating: 4.4, image: 'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?q=80&w=200&auto=format&fit=crop' },
        { id: 'p4', name: 'Sadhana Kala Kendra', location: 'Putalisadak, Kathmandu', rating: 4.2, image: 'https://images.unsplash.com/photo-1522337360705-8750d827a4d4?q=80&w=200&auto=format&fit=crop' },
        { id: 'p5', name: 'House of Fashion', location: 'Gairidhara, Kathmandu', rating: 4.5, image: 'https://images.unsplash.com/photo-1580618672591-eb18088a946f?q=80&w=200&auto=format&fit=crop' },
        { id: 'p6', name: 'Bliss Spa', location: 'Lazimpat, Kathmandu', rating: 4.7, image: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?q=80&w=200&auto=format&fit=crop' },
        { id: 'p7', name: 'Tranquility Spa', location: 'Thamel, Kathmandu', rating: 4.5, image: 'https://images.unsplash.com/photo-1600334089648-b0d9d3024a2c?q=80&w=200&auto=format&fit=crop' },
        { id: 'p8', name: 'Kinjjala Spa', location: 'Jhamsikhel, Lalitpur', rating: 4.6, image: 'https://images.unsplash.com/photo-1519823551278-64ac927ac4fb?q=80&w=200&auto=format&fit=crop' },
        { id: 'p9', name: 'Himalayan Healers', location: 'Thamel, Kathmandu', rating: 4.4, image: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?q=80&w=200&auto=format&fit=crop' },
        { id: 'p10', name: 'Seeing Hands', location: 'Baudha, Kathmandu', rating: 4.5, image: 'https://images.unsplash.com/photo-1515377905703-c4788e51af15?q=80&w=200&auto=format&fit=crop' }
    ]
};
