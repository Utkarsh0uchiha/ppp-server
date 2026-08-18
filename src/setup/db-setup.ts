import { dbPool } from "../connections/pg-connection";
import fs from 'fs';
import path from "path";

// Read the SQL file
const sqlFile = fs.readFileSync(path.join(__dirname, '../sql/schema-tables.sql')).toString();

// Function to execute each SQL statement individually
async function dbSetup(sqlFile: string) {
    const client = await dbPool.connect();
    try {
        // Split the SQL file into individual statements
        const sqlStatements = sqlFile
            .split(";")
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0); // Remove empty statements

        // Execute each statement sequentially
        for (const statement of sqlStatements) {
            await client.query(statement);
        }

        console.log("Tables created successfully");
    } catch (err) {
        console.error("Error creating tables:", err);
    } finally {
        client.release();
    }
}

// Execute the setup
dbSetup(sqlFile);
