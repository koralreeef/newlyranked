module.exports = (sequelize, DataTypes) => {
    return sequelize.define('currentSeasons', {
        id: {
            type: DataTypes.INTEGER
        },
        collection: {
            type: DataTypes.STRING,
        },
        map_id: {
            type: DataTypes.STRING,
            primaryKey: true,
        },
        set_id: {
            type: DataTypes.STRING,
        },
        adder: {
            type: DataTypes.STRING,
        },
        difficulty: {
            type: DataTypes.STRING,
        },
        title: {
            type: DataTypes.STRING,
        },
        artist: {
            type: DataTypes.STRING,
        },
        creator: {
            type: DataTypes.STRING,
        },
        creatorID: {
            type: DataTypes.STRING,
        },
        required_mods: {
            type: DataTypes.INTEGER
        },
        division: {
            type: DataTypes.INTEGER
        }
    }, {
        timestamps: true,
    });
};