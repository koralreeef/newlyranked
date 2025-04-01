module.exports = (sequelize, DataTypes) => {
	return sequelize.define('aimLists', {
		map_id: {
			type: DataTypes.STRING,
			primaryKey: true,
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
	}, {
		timestamps: false,
	});
};