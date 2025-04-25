module.exports = (sequelize, DataTypes) => {
	return sequelize.define('osuUsers', {
		user_id: {
			type: DataTypes.STRING,
			primaryKey: true,
		},
        username: {
            type: DataTypes.STRING,
        },
		lower: {
            type: DataTypes.STRING,
        },
		osu_id: {
			type: DataTypes.STRING,
			primaryKey: true,
		},
	}, {
		timestamps: false,
	});
};