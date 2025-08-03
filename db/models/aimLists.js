module.exports = (sequelize, DataTypes) => {
	return sequelize.define('aimLists', {
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
		}
	}, {
		timestamps: false,
	});
};