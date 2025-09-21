import { Embeddings } from "openai/resources.mjs";
import { Sequelize, DataTypes } from "sequelize";

const sequelize = new Sequelize({
    dialect: "sqlite",
    storage: 'instance.db',
    logging: false
});

const TextKnowledge = sequelize.define('TextKnowledge', {
    id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
        unique: true
    },
    text: {
        type: DataTypes.STRING,
        allowNull: false
    },
    model: {
        type: DataTypes.STRING,
        allowNull: false
    },
    data: {
        type: DataTypes.JSON,
        allowNull: false
    }
});

const Processes = sequelize.define('Processes', {
    id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
        unique: true
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: false
    }
});

const Tools = sequelize.define('Tools', {
    id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
        unique: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    parameters: {
        type: DataTypes.JSON,
        allowNull: false
    }
});

const ProcessRecords = sequelize.define("ProcessRecords", {
    id:{
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
        unique: true
    },
    history:{
        type: DataTypes.JSON,
        allowNull: false
    }
});

Processes.hasMany(ProcessRecords, {foreignKey: "process_id"})

sequelize.sync();

export default { TextKnowledges: TextKnowledge, Processes, Tools, ProcessRecords, sequelize }