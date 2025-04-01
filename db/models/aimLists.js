module.exports = (sequelize, DataTypes) => {
	return sequelize.define('aimLists', {
		map_id: {
			type: DataTypes.STRING,
			primaryKey: true,
		},
		adder: {
			type: DataTypes.STRING,
		},
	}, {
		timestamps: false,
	});
};