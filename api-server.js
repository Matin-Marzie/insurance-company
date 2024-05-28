import express from 'express';
import mysql from 'mysql2';
import bodyParser from 'body-parser';

const app = express();
const port = 4000;

// Middleware
app.use(bodyParser.json());

// Enable CORS
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
  res.setHeader('Access-Control-Allow-Credentials', true);
  next();
});

// MySQL pool
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '1234',
  database: 'Insurance_company'
}).promise();

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
    const query = 'SELECT p.FIRST_NAME, p.LAST_NAME, T_DATE FROM PATIENT p, VISIT v, DOCTOR d WHERE d.DOCTOR_ID = v.DOCTOR_ID AND v.PATIENT_ID = p.PATIENT_ID AND d.DOCTOR_ID = ?';
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

// 
// SELECT V.VISIT_ID, V.VISIT_DATE, D.DOCTOR_ID, D.FIRST_NAME, D.LAST_NAME
// FROM PATIENT P, VISIT V, DOCTOR D
// WHERE P.PATIENT_ID = V.PATIENT_ID AND V.DOCTOR_ID = D.DOCTOR_ID AND P.PATIENT_ID = 1;




// OK endpoint
app.get('/api/ok', (req, res) => {
  res.send('ok');
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
