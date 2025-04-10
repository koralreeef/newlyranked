module.exports = (sequelize, DataTypes) => {
	return sequelize.define('aimLists', {
		id: {
			type: DataTypes.INTEGER
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
	}, {
		timestamps: false,
	});
};