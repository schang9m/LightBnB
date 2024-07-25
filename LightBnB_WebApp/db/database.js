const properties = require("./json/properties.json");
const users = require("./json/users.json");

const { Pool } = require("pg");

const pool = new Pool({
  user: "development",
  password: "development",
  host: "localhost",
  database: "lightbnb",
});
/// Users

/**
 * Get a single user from the database given their email.
 * @param {String} email The email of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithEmail = function (email) {
  return pool.query('SELECT * FROM users WHERE email = $1', [email])
    .then(result => {
      // Return the first row or null if no rows are found
      return result.rows[0] || null;
    })
    .catch(err => {
      // Log the error and return null
      console.error('Error fetching user by email:', err);
      return null;
    });
};

/**
 * Get a single user from the database given their id.
 * @param {string} id The id of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithId = function (id) {
  return pool.query('SELECT * FROM users WHERE id = $1', [id])
    .then(result => {
      // Return the first row or null if no rows are found
      return result.rows[0] || null;
    })
    .catch(err => {
      // Log the error and return null
      console.error('Error fetching user by id:', err);
      return null;
    });
};

/**
 * Add a new user to the database.
 * @param {{name: string, password: string, email: string}} user
 * @return {Promise<{}>} A promise to the user.
 */
const addUser = function (user) {
  const {name, email, password} = user
  return pool.query('INSERT INTO users(name, email, password) VALUES ($1, $2, $3) RETURNING *', [name, email, password])
  .then(result => {
    // Return the first row or null if no rows are found
    return result.rows[0] || null;
  })
  .catch(err => {
    // Log the error and return null
    console.error('Error adding user:', err);
    return null;
  });
};

/// Reservations

/**
 * Get all reservations for a single user.
 * @param {string} guest_id The id of the user.
 * @return {Promise<[{}]>} A promise to the reservations.
 */
const getAllReservations = function (guest_id, limit = 10) {
  return pool
    .query(`SELECT reservations.id, properties.*, reservations.start_date, reservations.end_date, avg(rating) as average_rating
    FROM reservations
    JOIN properties ON reservations.property_id = properties.id
    JOIN property_reviews ON properties.id = property_reviews.property_id
    WHERE reservations.guest_id = $1
    GROUP BY properties.id, reservations.id
    ORDER BY reservations.start_date
    LIMIT $2;`, [guest_id, limit])
    .then((result) => {
      return result.rows;
    })
    .catch((err) => {
      console.log(err.message);
    });
};

/// Properties

/**
 * Get all properties.
 * @param {{}} options An object containing query options.
 * @param {*} limit The number of results to return.
 * @return {Promise<[{}]>}  A promise to the properties.
 */
const getAllProperties = function (options = {}, limit = 10) {
  const queryParams = [];
  let queryString = `
    SELECT properties.*, avg(property_reviews.rating) AS average_rating
    FROM properties
    JOIN property_reviews ON properties.id = property_reviews.property_id
    WHERE 1=1
  `;// make WHERE 1=1 so it's always true

  // Apply filters to the query
  if (options.city) {
    queryParams.push(`%${options.city}%`);
    queryString += `AND city ILIKE $${queryParams.length} `;
  }

  if (options.minimum_price_per_night) {
    queryParams.push(options.minimum_price_per_night * 100); // Convert dollars to cents
    queryString += `AND cost_per_night >= $${queryParams.length} `;
  }

  if (options.maximum_price_per_night) {
    queryParams.push(options.maximum_price_per_night * 100); // Convert dollars to cents
    queryString += `AND cost_per_night <= $${queryParams.length} `;
  }

  if (options.owner_id) {
    queryParams.push(options.owner_id);
    queryString += `AND owner_id = $${queryParams.length} `;
  }

  // Include the GROUP BY clause
  queryString += `GROUP BY properties.id`;

  // Apply the HAVING clause if a minimum rating is specified
  if (options.minimum_rating) {
    queryParams.push(options.minimum_rating);
    queryString += ` HAVING avg(property_reviews.rating) >= $${queryParams.length}`;
  }

  // Add ORDER BY and LIMIT clauses
  queryParams.push(limit); // Add limit to queryParams
  queryString += `
    ORDER BY cost_per_night
    LIMIT $${queryParams.length};
  `;

  // Log the query and parameters for debugging
  console.log(queryString, queryParams);

  // Execute the query and return the results
  return pool.query(queryString, queryParams)
    .then(result => result.rows)
    .catch(err => {
      console.error('Error fetching properties:', err);
      return [];
    });
};



/**
 * Add a property to the database
 * @param {{}} property An object containing all of the property details.
 * @return {Promise<{}>} A promise to the property.
 */
const addProperty = function (property) {
  return pool.query(`
    INSERT INTO properties(owner_id, title, description, thumbnail_photo_url, cover_photo_url, cost_per_night, street, city, province, post_code, country, parking_spaces, number_of_bathrooms, number_of_bedrooms)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *
    `
    , Object.values(property))
  .then(result => {
    // Return the first row or null if no rows are found
    return result.rows[0] || null;
  })
  .catch(err => {
    // Log the error and return null
    console.error('Error adding property:', err);
    return null;
  });
};

module.exports = {
  getUserWithEmail,
  getUserWithId,
  addUser,
  getAllReservations,
  getAllProperties,
  addProperty,
};
