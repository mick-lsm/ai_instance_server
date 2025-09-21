import database from "../../database.js";

export async function run({}){
    return await getCompleteDatabaseSchema(database.sequelize);
}

//ai generated script
async function getCompleteDatabaseSchema(sequelize) {
  let output = '';

  try {
    output += '=== COMPLETE SQLITE DATABASE SCHEMA ===\n\n';
    
    // Get all tables (excluding SQLite system tables)
    const tables = await sequelize.query(
      "SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
      { type: sequelize.QueryTypes.SELECT }
    );

    for (const table of tables) {
      output += `📊 TABLE: ${table.name}\n`;
      output += `   SQL: ${table.sql ? table.sql.substring(0, 100) + '...' : 'N/A'}\n`;
      
      // Get column information
      const columns = await sequelize.query(
        `PRAGMA table_info(${table.name})`,
        { type: sequelize.QueryTypes.SELECT }
      );
      
      output += '   COLUMNS:\n';
      columns.forEach(column => {
        output += `   ├─ ${column.name.padEnd(20)} ${column.type.padEnd(15)} ` +
                 `PK:${column.pk} NULL:${!column.notnull} DEFAULT:${column.dflt_value || 'NULL'}\n`;
      });

      // Get index information
      const indexes = await sequelize.query(
        `PRAGMA index_list(${table.name})`,
        { type: sequelize.QueryTypes.SELECT }
      );
      
      if (indexes.length > 0) {
        output += '   INDEXES:\n';
        for (const index of indexes) {
          const indexColumns = await sequelize.query(
            `PRAGMA index_info(${index.name})`,
            { type: sequelize.QueryTypes.SELECT }
          );
          const columnNames = indexColumns.map(col => col.name).join(', ');
          output += `   ├─ ${index.name.padEnd(20)} UNIQUE:${index.unique} COLUMNS: [${columnNames}]\n`;
        }
      }

      // Get foreign keys
      const foreignKeys = await sequelize.query(
        `PRAGMA foreign_key_list(${table.name})`,
        { type: sequelize.QueryTypes.SELECT }
      );
      
      if (foreignKeys.length > 0) {
        output += '   FOREIGN KEYS:\n';
        foreignKeys.forEach(fk => {
          output += `   ├─ ${fk.from} → ${fk.table}.${fk.to} ON UPDATE:${fk.on_update} ON DELETE:${fk.on_delete}\n`;
        });
      }

      // Get table statistics
      const rowCount = await sequelize.query(
        `SELECT COUNT(*) as count FROM ${table.name}`,
        { type: sequelize.QueryTypes.SELECT }
      );
      
      output += `   ROW COUNT: ${rowCount[0].count}\n`;
      output += '   ──────────────────────────────────────────────────────────\n';
    }

    // Print Sequelize model information
    output += '\n=== SEQUELIZE MODELS ===\n';
    const modelNames = Object.keys(sequelize.models);
    for (const modelName of modelNames) {
      const model = sequelize.models[modelName];
      output += `\n🔧 MODEL: ${modelName}\n`;
      output += `   TABLE: ${model.tableName}\n`;
      
      output += '   ATTRIBUTES:\n';
      Object.entries(model.rawAttributes).forEach(([attrName, attribute]) => {
        output += `   ├─ ${attrName.padEnd(20)} ${attribute.type.key.padEnd(15)} ` +
                 `PK:${!!attribute.primaryKey} NULL:${!!attribute.allowNull} ` +
                 `DEFAULT:${attribute.defaultValue || 'NULL'}\n`;
      });

      // Associations
      const associations = Object.entries(model.associations);
      if (associations.length > 0) {
        output += '   ASSOCIATIONS:\n';
        associations.forEach(([assocName, association]) => {
          output += `   ├─ ${assocName.padEnd(20)} ${association.associationType.padEnd(10)} ` +
                   `→ ${association.target.name}\n`;
        });
      }
    }

    // Database metadata
    output += '\n=== DATABASE METADATA ===\n';
    const dbInfo = await sequelize.query(
      "SELECT * FROM sqlite_master WHERE type='table'",
      { type: sequelize.QueryTypes.SELECT }
    );
    
    output += `Total tables: ${dbInfo.filter(t => !t.name.startsWith('sqlite_')).length}\n`;
    output += `Database file: ${sequelize.config.storage || 'memory'}\n`;
    output += `Dialect: ${sequelize.config.dialect}\n`;
    output += `Sequelize version: ${sequelize.constructor.version}\n`;

  } catch (error) {
    output += `Error reading database schema: ${error.message}\n`;
  }

  return output;
}

// Usage example:
async function printDatabaseSchema() {
  const schemaString = await getCompleteDatabaseSchema(database.sequelize);
  console.log(schemaString);
  return schemaString;
}