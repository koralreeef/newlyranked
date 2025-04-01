module.exports = (sequelize, DataTypes) => {
	return sequelize.define('aimScores', {
		map_id: {
			type: DataTypes.STRING,
		},
		user_id: {
			type: DataTypes.STRING,
		},
        username: {
            type: DataTypes.STRING,
        },
		mods: {
            type: DataTypes.STRING,
        },
		score: {
            type: DataTypes.INTEGER,
        },
		accuracy: {
            type: DataTypes.INTEGER,
        },
		misscount: {
            type: DataTypes.INTEGER,
        },
		max_combo: {
            type: DataTypes.INTEGER,
        },
		combo: {
            type: DataTypes.INTEGER,
        },
		date: {
			type: DataTypes.DATE
		}
	}, {
		timestamps: false,
	});
};