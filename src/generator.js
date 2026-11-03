/**
 * Realistic US Identity and Email Generator
 * Generates natural American names, US state codes, and realistic IDs
 */

const FIRST_NAMES_MALE = [
  'James', 'John', 'Robert', 'Michael', 'William', 'David', 'Richard', 'Joseph', 'Thomas', 'Charles',
  'Christopher', 'Daniel', 'Matthew', 'Anthony', 'Mark', 'Donald', 'Steven', 'Paul', 'Andrew', 'Joshua',
  'Kenneth', 'Kevin', 'Brian', 'George', 'Timothy', 'Ronald', 'Edward', 'Jason', 'Jeffrey', 'Ryan',
  'Jacob', 'Gary', 'Nicholas', 'Eric', 'Jonathan', 'Stephen', 'Larry', 'Justin', 'Scott', 'Brandon',
  'Benjamin', 'Samuel', 'Gregory', 'Alexander', 'Patrick', 'Frank', 'Raymond', 'Jack', 'Dennis', 'Jerry',
  'Tyler', 'Aaron', 'Jose', 'Henry', 'Douglas', 'Adam', 'Peter', 'Nathan', 'Zachary', 'Walter',
  'Kyle', 'Harold', 'Jeremy', 'Keith', 'Roger', 'Gerald', 'Ethan', 'Arthur', 'Christian', 'Sean',
  'Austin', 'Noah', 'Jesse', 'Albert', 'Bryan', 'Jordan', 'Dylan', 'Logan', 'Vincent', 'Bradley'
];

const FIRST_NAMES_FEMALE = [
  'Mary', 'Patricia', 'Jennifer', 'Linda', 'Elizabeth', 'Barbara', 'Susan', 'Jessica', 'Sarah', 'Karen',
  'Lisa', 'Nancy', 'Betty', 'Margaret', 'Sandra', 'Ashley', 'Kimberly', 'Emily', 'Donna', 'Michelle',
  'Carol', 'Amanda', 'Melissa', 'Deborah', 'Stephanie', 'Rebecca', 'Sharon', 'Laura', 'Cynthia', 'Kathleen',
  'Amy', 'Angela', 'Anna', 'Brenda', 'Pamela', 'Nicole', 'Emma', 'Samantha', 'Katherine', 'Christine',
  'Rachel', 'Catherine', 'Carolyn', 'Heather', 'Diane', 'Julie', 'Joyce', 'Victoria', 'Olivia', 'Kelly',
  'Christina', 'Lauren', 'Evelyn', 'Megan', 'Cheryl', 'Hannah', 'Martha', 'Jacqueline', 'Gloria', 'Teresa',
  'Kathryn', 'Sara', 'Madison', 'Abigail', 'Grace', 'Amber', 'Danielle', 'Sophia', 'Brittany', 'Natalie'
];

const LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
  'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin',
  'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson',
  'Walker', 'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores',
  'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell', 'Carter', 'Roberts',
  'Gomez', 'Phillips', 'Evans', 'Turner', 'Diaz', 'Parker', 'Cruz', 'Edwards', 'Collins', 'Reyes',
  'Stewart', 'Morris', 'Morales', 'Murphy', 'Cook', 'Rogers', 'Gutierrez', 'Ortiz', 'Morgan', 'Cooper',
  'Peterson', 'Bailey', 'Reed', 'Kelly', 'Howard', 'Ramos', 'Kim', 'Cox', 'Ward', 'Richardson',
  'Watson', 'Brooks', 'Chavez', 'Wood', 'James', 'Bennett', 'Gray', 'Mendoza', 'Hughes', 'Price',
  'Alvarez', 'Castillo', 'Sanders', 'Patel', 'Myers', 'Long', 'Ross', 'Foster', 'Powell', 'Jenkins',
  'Perry', 'Russell', 'Sullivan', 'Bell', 'Coleman', 'Butler', 'Henderson', 'Barnes', 'Gonzales', 'Fisher'
];

const US_LOCATIONS = [
  { state: 'NY', stateName: 'New York', city: 'New York', zip: '10001', areaCode: '212' },
  { state: 'NY', stateName: 'New York', city: 'Brooklyn', zip: '11201', areaCode: '718' },
  { state: 'CA', stateName: 'California', city: 'Los Angeles', zip: '90012', areaCode: '213' },
  { state: 'CA', stateName: 'California', city: 'San Francisco', zip: '94102', areaCode: '415' },
  { state: 'CA', stateName: 'California', city: 'San Diego', zip: '92101', areaCode: '619' },
  { state: 'TX', stateName: 'Texas', city: 'Houston', zip: '77002', areaCode: '713' },
  { state: 'TX', stateName: 'Texas', city: 'Austin', zip: '78701', areaCode: '512' },
  { state: 'TX', stateName: 'Texas', city: 'Dallas', zip: '75201', areaCode: '214' },
  { state: 'FL', stateName: 'Florida', city: 'Miami', zip: '33101', areaCode: '305' },
  { state: 'FL', stateName: 'Florida', city: 'Orlando', zip: '32801', areaCode: '407' },
  { state: 'FL', stateName: 'Florida', city: 'Tampa', zip: '33602', areaCode: '813' },
  { state: 'IL', stateName: 'Illinois', city: 'Chicago', zip: '60601', areaCode: '312' },
  { state: 'WA', stateName: 'Washington', city: 'Seattle', zip: '98101', areaCode: '206' },
  { state: 'MA', stateName: 'Massachusetts', city: 'Boston', zip: '02108', areaCode: '617' },
  { state: 'CO', stateName: 'Colorado', city: 'Denver', zip: '80202', areaCode: '303' },
  { state: 'AZ', stateName: 'Arizona', city: 'Phoenix', zip: '85001', areaCode: '602' },
  { state: 'GA', stateName: 'Georgia', city: 'Atlanta', zip: '30303', areaCode: '404' },
  { state: 'NC', stateName: 'North Carolina', city: 'Charlotte', zip: '28202', areaCode: '704' },
  { state: 'PA', stateName: 'Pennsylvania', city: 'Philadelphia', zip: '19102', areaCode: '215' },
  { state: 'OH', stateName: 'Ohio', city: 'Columbus', zip: '43215', areaCode: '614' },
  { state: 'NV', stateName: 'Nevada', city: 'Las Vegas', zip: '89101', areaCode: '702' },
  { state: 'TN', stateName: 'Tennessee', city: 'Nashville', zip: '37201', areaCode: '615' }
];

function randomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function randomNumber(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateUSIdentity(customDomain = 'sapokas.com') {
  const isFemale = Math.random() > 0.5;
  const firstName = isFemale ? randomItem(FIRST_NAMES_FEMALE) : randomItem(FIRST_NAMES_MALE);
  const lastName = randomItem(LAST_NAMES);
  const loc = randomItem(US_LOCATIONS);

  const cleanFirst = firstName.toLowerCase().replace(/[^a-z]/g, '');
  const cleanLast = lastName.toLowerCase().replace(/[^a-z]/g, '');
  const stateLower = loc.state.toLowerCase();

  // Different realistic US ID suffix styles
  const num2Digits = randomNumber(10, 99);
  const num3Digits = randomNumber(100, 999);
  const birthYear = randomNumber(1982, 2004);
  const yearShort = String(birthYear).slice(-2);

  const formats = [
    // format 1: ethan.cooper.us94@domain
    `${cleanFirst}.${cleanLast}.us${num2Digits}`,
    // format 2: ethan.cooper.tx21@domain
    `${cleanFirst}.${cleanLast}.${stateLower}${num2Digits}`,
    // format 3: ecooper.us88@domain
    `${cleanFirst[0]}${cleanLast}.us${num2Digits}`,
    // format 4: ethan.cooper.usa@domain
    `${cleanFirst}.${cleanLast}.usa`,
    // format 5: ethan.cooper.id419@domain
    `${cleanFirst}.${cleanLast}.id${num3Digits}`,
    // format 6: ethan94.cooper@domain
    `${cleanFirst}${yearShort}.${cleanLast}`,
    // format 7: ethan.cooper.ny@domain
    `${cleanFirst}.${cleanLast}.${stateLower}`,
    // format 8: ethan_cooper_us@domain
    `${cleanFirst}_${cleanLast}_us`
  ];

  const username = randomItem(formats);
  const domain = (customDomain || 'sapokas.com').replace(/^@/, '').trim();
  const email = `${username}@${domain}`;

  // Fake realistic phone (+1 (areaCode) 555-XXXX)
  const phoneSuffix = randomNumber(1000, 9999);
  const phone = `+1 (${loc.areaCode}) 555-${phoneSuffix}`;

  return {
    firstName,
    lastName,
    fullName: `${firstName} ${lastName}`,
    gender: isFemale ? 'Female' : 'Male',
    username,
    domain,
    email,
    location: {
      city: loc.city,
      state: loc.state,
      stateName: loc.stateName,
      zip: loc.zip,
      country: 'United States'
    },
    phone,
    birthYear,
    createdAt: new Date().toISOString()
  };
}

module.exports = {
  generateUSIdentity,
  US_LOCATIONS
};
