import express from 'express';
import mysql from 'mysql2';
import bodyParser from 'body-parser';

const SERVER_PORT = 4000;

const app = express();
const PORT = 3306;
// This database has only chatgpt generated data (fake)
const HOST = 'sql7.freesqldatabase.com';
const USERNAME = 'sql7716032';
const PASSWORD = 'EJxi2z7VUU';
const DATABASE_NAME = 'sql7716032';

// Middleware
app.use(bodyParser.json());

// Enable CORS
app.use((req, res, next) => {
  // * : αφήνω όλους να έχουν πρόσβαση στο api και βάση
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
  res.setHeader('Access-Control-Allow-Credentials', true);
  next();
});

// MySQL pool
const pool = mysql.createPool({
  host: HOST,
  user: USERNAME,
  password: PASSWORD,
  database: DATABASE_NAME
}).promise();


// Function to check database connection
const checkDatabaseConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('Database connection successful');
    connection.release();
  } catch (error) {
    console.error('Database connection error:', error);
  }
};

// Check the database connection on startup
checkDatabaseConnection();

// Login endpoint for Doctor
app.post('/doctor/login', async (req, res) => {
  const { doctorName, doctorLastName, doctor_id } = req.body;
  try {
    let query, params;
    if (doctor_id) {
      query = 'SELECT * FROM DOCTOR WHERE DOCTOR_ID = ?';
      params = [doctor_id];
    } else if (doctorName && doctorLastName) {
      query = 'SELECT * FROM DOCTOR WHERE FIRST_NAME = ? AND LAST_NAME = ?';
      params = [doctorName, doctorLastName];
    } else {
      return res.status(400).json({ message: 'Invalid login credentials' });
    }

    const [rows] = await pool.query(query, params);

    if (rows.length > 0) {
      res.json(rows[0]);
    } else {
      res.status(401).json({ message: 'Invalid login credentials' });
    }
  } catch (error) {
    console.error('Error querying the database:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Επισκέψεις ασθενών στον γιατρό Χ
app.post('/doctor/visits', async (req, res) => {
  const { doctorId } = req.body;

  if (!doctorId) {
    return res.status(400).json({ message: 'Doctor ID is required' });
  }

  try {
    const query = 'SELECT p.FIRST_NAME, p.LAST_NAME, v.VISIT_DATE FROM PATIENT p, VISIT v, DOCTOR d WHERE d.DOCTOR_ID = v.DOCTOR_ID AND v.PATIENT_ID = p.PATIENT_ID AND d.DOCTOR_ID = ?';
    const [rows] = await pool.query(query, [doctorId]);

    if (rows.length > 0) {
      res.json(rows);
    } else {
      res.json([]);
    }
  } catch (error) {
    console.error('Error querying the database:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});



// Κάθε γιατρός με ποιά νοσοκομείο συνεργάζεται
app.post('/doctor/collabsWith', async (req, res) => {
  const { doctor_id } = req.body;

  if (!doctor_id) {
    return res.status(400).json({ message: 'Doctor ID is required' });
  }

  try {
    const query = `
    SELECT HOSPITAL_CLINIC.* FROM DOCTOR d, COLLABS_WITH, HOSPITAL_CLINIC WHERE d.DOCTOR_ID = COLLABS_WITH.DOCTOR_ID AND COLLABS_WITH.HOSPITAL_CLINIC_ID = HOSPITAL_CLINIC.HOSPITAL_CLINIC_ID AND d.DOCTOR_ID = ?
    `;
    const params = [doctor_id];
    const [rows] = await pool.query(query, params);

    if (rows.length > 0) {
      res.json(rows);
    } else {
      res.status(204).json([]); // No Content
    }
  } catch (error) {
    console.error('Error querying the database:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});



// οι ασθενής που παρακολουθεί τώρα!
app.post('/doctor/monitors', async (req, res) => {
  const { doctor_id } = req.body;

  if (!doctor_id) {
    return res.status(400).json({ message: 'Doctor ID is required' });
  }

  try {
    const query = `
    SELECT P.*, M.START_DATE, M.END_DATE FROM PATIENT P, MONITORS M, DOCTOR D WHERE P.PATIENT_ID = M.PATIENT_ID AND M.DOCTOR_ID = D.DOCTOR_ID AND D.DOCTOR_ID = ?
    `;
    const params = [doctor_id];
    const [rows] = await pool.query(query, params);

    if (rows.length > 0) {
      res.json(rows);
    } else {
      res.status(204).json([]); // No Content
    }
  } catch (error) {
    console.error('Error querying the database:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});


// Τα φάρμακα που έχει συνταγογραφήσει ο γιατρός
app.post('/doctor/medicines', async (req, res) => {
  const { doctor_id } = req.body;

  if (!doctor_id) {
    return res.status(400).json({ message: 'Doctor ID is required' });
  }

  try {
    const query = `
    SELECT M.*
FROM INCLUDES INC, MEDICINE M, PRESCRIPTION PR, DOCTOR DR
WHERE INC.MEDICINE_ID = M.MEDICINE_ID AND INC.PRESCRIPTION_ID = PR.PRESCRIPTION_ID AND PR.DOCTOR_ID = DR.DOCTOR_ID AND DR.DOCTOR_ID = ?
    `;
    const params = [doctor_id];
    const [rows] = await pool.query(query, params);

    if (rows.length > 0) {
      res.json(rows);
    } else {
      res.status(204).json([]); // No Content
    }
  } catch (error) {
    console.error('Error querying the database:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});



// Εισαγωγή φαρμάκων
app.post('/insert/medicine', async (req, res) => {
  const { name, medicineUsage, sideEffects, prescriptionNeeded, covered, doctorIndication } = req.body;

  try {
    const query = 'INSERT INTO MEDICINE (NAME, MEDICINE_USAGE, SIDE_EFFECTS, PRESCRIPTION_NEEDED, COVERED, DOCTOR_INDICATION) VALUES (?, ?, ?, ?, ?, ?)';
    const params = [name, medicineUsage, sideEffects, prescriptionNeeded, covered, doctorIndication];
    const [result] = await pool.query(query, params);
    res.json({ message: 'Medicine added successfully', medicineId: result.insertId });
  } catch (error) {
    console.error('Error inserting into the database:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});


// || --------------------PATIENT--------------------||
// Login endpoint for Patient
app.post('/patient/login', async (req, res) => {
  const { patientName, patientLastName, patient_id } = req.body;
  try {
    let query, params;
    if (patient_id) {
      query = 'SELECT * FROM PATIENT WHERE PATIENT_ID = ?';
      params = [patient_id];
    } else if (patientName && patientLastName) {
      query = 'SELECT * FROM PATIENT WHERE FIRST_NAME = ? AND LAST_NAME = ?';
      params = [patientName, patientLastName];
    } else {
      return res.status(400).json({ message: 'Invalid login credentials' });
    }

    const [rows] = await pool.query(query, params);

    if (rows.length > 0) {
      res.json(rows[0]);
    } else {
      res.status(401).json({ message: 'Invalid login credentials' });
    }
  } catch (error) {
    console.error('Error querying the database:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});



// Εισαγωγή Ασθενών στην βάση
app.post('/insert/patient', async (req, res) => {
  const {
    firstName,
    lastName,
    tel,
    email,
    address,
    age,
    amka,
    familyInsuranceProvider,
    companyId,
    doctorId
  } = req.body;

  try {
    const query = `
      INSERT INTO PATIENT (
        FIRST_NAME, 
        LAST_NAME, 
        TEL, 
        EMAIL, 
        ADDRESS, 
        AGE, 
        AMKA, 
        FAMILY_INSURANCE_PROVIDER, 
        COMPANY_ID, 
        DOCTOR_ID
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      firstName,
      lastName,
      tel,
      email,
      address,
      age,
      amka,
      familyInsuranceProvider || null,
      companyId || null,
      doctorId || null
    ];
    const [result] = await pool.query(query, params);
    res.json({ message: 'Patient added successfully', patientId: result.insertId });
  } catch (error) {
    console.error('Error inserting into the database:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});



// Εισαγωγή επίσκεψης ασθενή
app.post('/insert/visit', async (req, res) => {
  const {
    patientId,
    doctorId,
    visitDate,
    visitType,
    initialDiagnose,
    currentCondition,
    bloodPressure,
    height,
    weight
  } = req.body;

  let visitQuery, visitParams;
  let subVisitQuery, subVisitParams;

  visitQuery = `
    INSERT INTO VISIT (
      PATIENT_ID, 
      DOCTOR_ID, 
      VISIT_DATE, 
      TYPE
    ) VALUES (?, ?, ?, ?)
  `;
  visitParams = [patientId, doctorId, visitDate, visitType];

  try {
    const [result] = await pool.query(visitQuery, visitParams);
    const visitId = result.insertId;

    switch (visitType) {
      case 'INITIAL_VISIT':
        subVisitQuery = `
          INSERT INTO INITIAL_VISIT (
            VISIT_ID, 
            INITIAL_DIAGNOSIS
          ) VALUES (?, ?)
        `;
        subVisitParams = [visitId, initialDiagnose];
        break;
      case 'FOLLOW_UP_VISIT':
        subVisitQuery = `
          INSERT INTO FOLLOW_UP_VISIT (
            VISIT_ID, 
            CURRENT_CONDITION
          ) VALUES (?, ?)
        `;
        subVisitParams = [visitId, currentCondition];
        break;
      case 'CHECKUP_VISIT':
        subVisitQuery = `
          INSERT INTO CHECK_UP_VISIT (
            VISIT_ID, 
            BLOOD_PRESSURE, 
            HEIGHT, 
            WEIGHT
          ) VALUES (?, ?, ?, ?)
        `;
        subVisitParams = [visitId, bloodPressure, height, weight];
        break;
      default:
        return res.status(400).json({ message: 'Invalid visit type' });
    }

    await pool.query(subVisitQuery, subVisitParams);
    res.json({ message: 'Visit added successfully', visitId: visitId });
  } catch (error) {
    console.error('Error inserting into the database:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});


// Επισκέψεις του ασθενή
app.post('/patient/visits', async (req, res) => {
  const { patientId } = req.body;

  if (!patientId) {
    return res.status(400).json({ message: 'Patient ID is required' });
  }

  try {
    const query = `
      SELECT V.VISIT_ID, V.VISIT_DATE, D.DOCTOR_ID, D.FIRST_NAME, D.LAST_NAME
      FROM PATIENT P, VISIT V, DOCTOR D
      WHERE P.PATIENT_ID = V.PATIENT_ID AND V.DOCTOR_ID = D.DOCTOR_ID AND P.PATIENT_ID = ?
    `;
    const [rows] = await pool.query(query, [patientId]);

    if (rows.length > 0) {
      res.json(rows);
    } else {
      res.status(204).json([]); // No Content
    }
  } catch (error) {
    console.error('Error querying the database:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});


// Συνταγογραφούμενα φάρμακα του ασθενή
app.post('/patient/medicines', async (req, res) => {
  const { patientId } = req.body;
  try {
    const query = `
      SELECT 
          CONCAT(d.FIRST_NAME, ' ', d.LAST_NAME) AS DOCTOR_NAME,
          v.TYPE,
          CASE 
              WHEN v.TYPE = 'Initial' THEN i.INITIAL_DIAGNOSIS
              WHEN v.TYPE = 'Follow-Up' THEN f.CURRENT_CONDITION
          END AS DIAGNOSIS,
          m.NAME AS MEDICINE_PRESCRIBED,
          m.DOCTOR_INDICATION
      FROM 
          PRESCRIPTION pr
      JOIN 
          INCLUDES inc ON pr.PRESCRIPTION_ID = inc.PRESCRIPTION_ID
      JOIN 
          MEDICINE m ON inc.MEDICINE_ID = m.MEDICINE_ID
      JOIN 
          VISIT v ON pr.VISIT_ID = v.VISIT_ID
      JOIN 
          PATIENT p ON pr.PATIENT_ID = p.PATIENT_ID
      JOIN 
          DOCTOR d ON pr.DOCTOR_ID = d.DOCTOR_ID
      LEFT JOIN 
          INITIAL_VISIT i ON v.VISIT_ID = i.VISIT_ID
      LEFT JOIN 
          FOLLOW_UP_VISIT f ON v.VISIT_ID = f.VISIT_ID
      WHERE 
          p.PATIENT_ID = ?;
  `;

    const [rows] = await pool.query(query, [patientId]);

    if (rows.length > 0) {
      res.json(rows);
    } else {
      res.status(204).json([]); // No Content
    }
  } catch (error) {
    console.error('Error querying the database:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});


// Ποιοί γιατροί και για ποιά διαστήματα παρακολουθούν τον ασθενή X
app.post('/patient/doctors', async (req, res) => {
  const { patientId } = req.body;
  try {
    const query = `
      SELECT 
          DOCTOR.DOCTOR_ID,
          CONCAT(DOCTOR.FIRST_NAME, ' ', DOCTOR.LAST_NAME) AS DOCTOR_NAME,
          MONITORS.START_DATE,
          MONITORS.END_DATE
      FROM 
          MONITORS, DOCTOR
      WHERE 
          MONITORS.DOCTOR_ID = DOCTOR.DOCTOR_ID AND MONITORS.PATIENT_ID = ?;
    `;

    const [rows] = await pool.query(query, [patientId]);

    if (rows.length > 0) {
      res.json(rows);
    } else {
      res.status(204).json([]); // No Content
    }
  } catch (error) {
    console.error('Error querying the database:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});




// Μέσες τιμές των εξετάσεων στο check up
app.post('/patient/checkup/avg', async (req, res) => {
  const { patientId } = req.body;
  try {
    const query = `
      SELECT 
          AVG(HEIGHT) AS AVERAGE_HEIGHT,
          AVG(WEIGHT) AS AVERAGE_WEIGHT,
          AVG(BLOOD_PRESSURE) AS AVERAGE_BLOOD_PRESSURE
      FROM 
          CHECK_UP_VISIT
      WHERE 
          VISIT_ID IN (
              SELECT VISIT_ID
              FROM VISIT
              WHERE PATIENT_ID = ?
          );
    `;

    const [rows] = await pool.query(query, [patientId]);

    if (rows.length > 0) {
      res.json(rows[0]);
    } else {
      res.status(204).json([]); // No Content
    }
  } catch (error) {
    console.error('Error querying the database:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});



// Όλες οι επισκέψεις του ασθενή στον γιατρό Y
app.post('/patient/visit/doctor', async (req, res) => {
  const { patientId, doctorId } = req.body;
  try {
    const query = `
      SELECT V.VISIT_DATE
      FROM DOCTOR D, PATIENT P, VISIT V
      WHERE D.DOCTOR_ID = V.DOCTOR_ID AND V.PATIENT_ID = P.PATIENT_ID AND P.PATIENT_ID = ? AND D.DOCTOR_ID = ?;
    `;

    const [rows] = await pool.query(query, [patientId, doctorId]);

    if (rows.length > 0) {
      res.json(rows);
    } else {
      res.status(204).json([]); // No Content
    }
  } catch (error) {
    console.error('Error querying the database:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});


// Πλήθος των γιατρών που έχει αλλάξει ο ασθενής X
app.post('/patient/doctor/count', async (req, res) => {
  const { patientId } = req.body;
  try {
    const query = `
      SELECT 
          PATIENT_ID,
          COUNT(DISTINCT DOCTOR_ID) AS CHANGED_DOCTORS_COUNT
      FROM 
          MONITORS
      WHERE PATIENT_ID = ?;
    `;

    const [rows] = await pool.query(query, [patientId]);

    if (rows.length > 0) {
      res.json(rows[0]);
    } else {
      res.status(204).json({}); // No Content
    }
  } catch (error) {
    console.error('Error querying the database:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});



// OK endpoint
app.get('/api/ok', (req, res) => {
  res.send('ok');
});

// Start the server
app.listen(SERVER_PORT, () => {
  console.log(`Server is running on port: ${PORT}`);
});
