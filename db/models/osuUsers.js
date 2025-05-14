module.exports = (sequelize, DataTypes) => {
	return sequelize.define('osuUsers', {
		user_id: {
			type: DataTypes.STRING,
			primaryKey: true,
		},
        username: {
            type: DataTypes.STRING,
        },
		osu_id: {
			type: DataTypes.STRING,
			primaryKey: true,
		},
		hr1: {
			type: DataTypes.BOOLEAN,
		},
		nm1: {
			type: DataTypes.BOOLEAN,
		},
		dt1: {
			type: DataTypes.BOOLEAN,
		},
		hr2: {
			type: DataTypes.BOOLEAN,
		},
		nm2: {
			type: DataTypes.BOOLEAN,
		},
		dt2: {
			type: DataTypes.BOOLEAN,
		},
	}, {
		timestamps: false,
	});
};