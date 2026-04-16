import { DataTypes } from 'sequelize';

/**
 * Sequelize mutates attribute definition objects in place (e.g. adds `field` for underscored columns).
 * Reusing one shared object across models corrupts every column that referenced it — always return a fresh object.
 */

/** MySQL `INT UNSIGNED` auto-increment primary key — standard monotonic row id. */
export function autoIncrementPk() {
  return {
    type: DataTypes.INTEGER.UNSIGNED,
    autoIncrement: true,
    primaryKey: true,
    allowNull: false,
  };
}

/** Foreign key to another table's `autoIncrementPk` column. */
export function fkUnsignedInt() {
  return {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
  };
}

export function fkUnsignedIntNullable() {
  return {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: true,
  };
}
