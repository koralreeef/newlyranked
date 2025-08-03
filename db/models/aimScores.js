module.exports = (sequelize, DataTypes) => {
	return sequelize.define('aimScores', {
		index: {
			type: DataTypes.INTEGER,
        },
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
		collection: {
            type: DataTypes.STRING,
        },
		score: {
            type: DataTypes.INTEGER,
        },
		pp:{ 
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
		},
		hidden: {
			type: DataTypes.BOOLEAN
		},
		is_current: {
			type: DataTypes.INTEGER
		},
		required_dt: {
			type: DataTypes.BOOLEAN,
		},
		required_hr: {
			type: DataTypes.BOOLEAN,
		},
		past_season: {
			type: DataTypes.INTEGER
		},
	}, {
		timestamps: false,
	});
};