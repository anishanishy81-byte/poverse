// Location data for dropdowns
export interface LocationData {
  countries: string[];
  states: { [country: string]: string[] };
  cities: { [state: string]: string[] };
}

export const countries = [
  "India",
  "United States",
  "United Kingdom",
  "Canada",
  "Australia",
  "Germany",
  "France",
  "Japan",
  "Singapore",
  "UAE",
];

export const statesByCountry: { [country: string]: string[] } = {
  "India": [
    "Andhra Pradesh",
    "Arunachal Pradesh",
    "Assam",
    "Bihar",
    "Chhattisgarh",
    "Delhi",
    "Goa",
    "Gujarat",
    "Haryana",
    "Himachal Pradesh",
    "Jharkhand",
    "Karnataka",
    "Kerala",
    "Madhya Pradesh",
    "Maharashtra",
    "Manipur",
    "Meghalaya",
    "Mizoram",
    "Nagaland",
    "Odisha",
    "Punjab",
    "Rajasthan",
    "Sikkim",
    "Tamil Nadu",
    "Telangana",
    "Tripura",
    "Uttar Pradesh",
    "Uttarakhand",
    "West Bengal",
  ],
  "United States": [
    "Alabama",
    "Alaska",
    "Arizona",
    "Arkansas",
    "California",
    "Colorado",
    "Connecticut",
    "Delaware",
    "Florida",
    "Georgia",
    "Hawaii",
    "Idaho",
    "Illinois",
    "Indiana",
    "Iowa",
    "Kansas",
    "Kentucky",
    "Louisiana",
    "Maine",
    "Maryland",
    "Massachusetts",
    "Michigan",
    "Minnesota",
    "Mississippi",
    "Missouri",
    "Montana",
    "Nebraska",
    "Nevada",
    "New Hampshire",
    "New Jersey",
    "New Mexico",
    "New York",
    "North Carolina",
    "North Dakota",
    "Ohio",
    "Oklahoma",
    "Oregon",
    "Pennsylvania",
    "Rhode Island",
    "South Carolina",
    "South Dakota",
    "Tennessee",
    "Texas",
    "Utah",
    "Vermont",
    "Virginia",
    "Washington",
    "West Virginia",
    "Wisconsin",
    "Wyoming",
  ],
  "United Kingdom": [
    "England",
    "Scotland",
    "Wales",
    "Northern Ireland",
  ],
  "Canada": [
    "Alberta",
    "British Columbia",
    "Manitoba",
    "New Brunswick",
    "Newfoundland and Labrador",
    "Nova Scotia",
    "Ontario",
    "Prince Edward Island",
    "Quebec",
    "Saskatchewan",
  ],
  "Australia": [
    "New South Wales",
    "Victoria",
    "Queensland",
    "Western Australia",
    "South Australia",
    "Tasmania",
  ],
  "Germany": [
    "Bavaria",
    "Berlin",
    "Hamburg",
    "Hesse",
    "North Rhine-Westphalia",
    "Saxony",
  ],
  "France": [
    "Île-de-France",
    "Provence-Alpes-Côte d'Azur",
    "Auvergne-Rhône-Alpes",
    "Nouvelle-Aquitaine",
    "Occitanie",
  ],
  "Japan": [
    "Tokyo",
    "Osaka",
    "Kyoto",
    "Hokkaido",
    "Fukuoka",
  ],
  "Singapore": [
    "Central Region",
    "East Region",
    "North Region",
    "North-East Region",
    "West Region",
  ],
  "UAE": [
    "Abu Dhabi",
    "Dubai",
    "Sharjah",
    "Ajman",
    "Ras Al Khaimah",
    "Fujairah",
    "Umm Al Quwain",
  ],
};

export const citiesByState: { [state: string]: string[] } = {
  // India
  "Andhra Pradesh": ["Visakhapatnam", "Vijayawada", "Guntur", "Tirupati", "Nellore", "Kurnool"],
  "Karnataka": ["Bangalore", "Mysore", "Hubli", "Mangalore", "Belgaum", "Gulbarga"],
  "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai", "Tiruchirappalli", "Salem", "Tirunelveli"],
  "Maharashtra": ["Mumbai", "Pune", "Nagpur", "Thane", "Nashik", "Aurangabad"],
  "Delhi": ["New Delhi", "Central Delhi", "South Delhi", "North Delhi", "East Delhi", "West Delhi"],
  "Gujarat": ["Ahmedabad", "Surat", "Vadodara", "Rajkot", "Bhavnagar", "Jamnagar"],
  "Telangana": ["Hyderabad", "Warangal", "Nizamabad", "Karimnagar", "Khammam"],
  "Kerala": ["Thiruvananthapuram", "Kochi", "Kozhikode", "Thrissur", "Kollam"],
  "West Bengal": ["Kolkata", "Howrah", "Durgapur", "Asansol", "Siliguri"],
  "Uttar Pradesh": ["Lucknow", "Kanpur", "Agra", "Varanasi", "Allahabad", "Noida", "Ghaziabad"],
  "Rajasthan": ["Jaipur", "Jodhpur", "Udaipur", "Kota", "Bikaner", "Ajmer"],
  "Punjab": ["Chandigarh", "Ludhiana", "Amritsar", "Jalandhar", "Patiala"],
  "Haryana": ["Gurugram", "Faridabad", "Panipat", "Ambala", "Karnal"],
  "Bihar": ["Patna", "Gaya", "Bhagalpur", "Muzaffarpur", "Darbhanga"],
  "Madhya Pradesh": ["Bhopal", "Indore", "Jabalpur", "Gwalior", "Ujjain"],
  "Odisha": ["Bhubaneswar", "Cuttack", "Rourkela", "Berhampur", "Sambalpur"],
  "Jharkhand": ["Ranchi", "Jamshedpur", "Dhanbad", "Bokaro", "Hazaribagh"],
  "Chhattisgarh": ["Raipur", "Bhilai", "Bilaspur", "Korba", "Durg"],
  "Assam": ["Guwahati", "Silchar", "Dibrugarh", "Jorhat", "Tezpur"],
  "Goa": ["Panaji", "Margao", "Vasco da Gama", "Mapusa", "Ponda"],
  
  // United States
  "California": ["Los Angeles", "San Francisco", "San Diego", "San Jose", "Sacramento", "Oakland"],
  "New York": ["New York City", "Buffalo", "Rochester", "Albany", "Syracuse"],
  "Texas": ["Houston", "Dallas", "Austin", "San Antonio", "Fort Worth", "El Paso"],
  "Florida": ["Miami", "Orlando", "Tampa", "Jacksonville", "Fort Lauderdale"],
  "Illinois": ["Chicago", "Aurora", "Naperville", "Rockford", "Springfield"],
  "Pennsylvania": ["Philadelphia", "Pittsburgh", "Allentown", "Erie", "Reading"],
  "Ohio": ["Columbus", "Cleveland", "Cincinnati", "Toledo", "Akron"],
  "Georgia": ["Atlanta", "Augusta", "Columbus", "Savannah", "Athens"],
  "Washington": ["Seattle", "Spokane", "Tacoma", "Vancouver", "Bellevue"],
  "Massachusetts": ["Boston", "Worcester", "Springfield", "Cambridge", "Lowell"],
  
  // United Kingdom
  "England": ["London", "Manchester", "Birmingham", "Liverpool", "Leeds", "Bristol"],
  "Scotland": ["Edinburgh", "Glasgow", "Aberdeen", "Dundee", "Inverness"],
  "Wales": ["Cardiff", "Swansea", "Newport", "Wrexham", "Barry"],
  "Northern Ireland": ["Belfast", "Derry", "Lisburn", "Newry", "Bangor"],
  
  // Canada
  "Ontario": ["Toronto", "Ottawa", "Mississauga", "Hamilton", "London"],
  "Quebec": ["Montreal", "Quebec City", "Laval", "Gatineau", "Longueuil"],
  "British Columbia": ["Vancouver", "Victoria", "Surrey", "Burnaby", "Richmond"],
  "Alberta": ["Calgary", "Edmonton", "Red Deer", "Lethbridge", "Medicine Hat"],
  
  // Australia
  "New South Wales": ["Sydney", "Newcastle", "Wollongong", "Central Coast"],
  "Victoria": ["Melbourne", "Geelong", "Ballarat", "Bendigo"],
  "Queensland": ["Brisbane", "Gold Coast", "Cairns", "Townsville"],
  "Western Australia": ["Perth", "Fremantle", "Mandurah", "Bunbury"],
  
  // Germany
  "Bavaria": ["Munich", "Nuremberg", "Augsburg", "Regensburg"],
  "Berlin": ["Berlin"],
  "Hamburg": ["Hamburg"],
  "North Rhine-Westphalia": ["Cologne", "Düsseldorf", "Dortmund", "Essen"],
  
  // Japan
  "Tokyo": ["Tokyo", "Shibuya", "Shinjuku", "Minato"],
  "Osaka": ["Osaka", "Sakai", "Higashiosaka"],
  "Kyoto": ["Kyoto", "Uji", "Kameoka"],
  
  // Singapore
  "Central Region": ["Downtown Core", "Marina Bay", "Orchard"],
  "East Region": ["Tampines", "Bedok", "Changi"],
  
  // UAE
  "Dubai": ["Dubai City", "Deira", "Bur Dubai", "Jumeirah"],
  "Abu Dhabi": ["Abu Dhabi City", "Al Ain", "Khalifa City"],
  "Sharjah": ["Sharjah City", "Al Nahda", "Al Majaz"],
};

export const getStatesForCountry = (country: string): string[] => {
  return statesByCountry[country] || [];
};

export const getCitiesForState = (state: string): string[] => {
  return citiesByState[state] || [];
};
