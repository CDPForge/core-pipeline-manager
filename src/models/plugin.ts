import { Column, DataType, Model, Table } from 'sequelize-typescript';

@Table({
    tableName: 'plugins',
    timestamps: true,
    underscored: true,
})
export default class Plugin extends Model {
    @Column({
        type: DataType.BIGINT,
        primaryKey: true,
        autoIncrement: true,
    })
    id!: number;

    @Column({
        type: DataType.STRING,
        allowNull: false
    })
    name!: string;

    @Column({
        type: DataType.STRING,
        allowNull: false
    })
    type!: string;

    @Column({
        type: DataType.INTEGER,
        allowNull: false
    })
    priority!: number;

    @Column({
        type: DataType.STRING,
        allowNull: false
    })
    inputTopic!: string;

    @Column({
        type: DataType.STRING,
        allowNull: true
    })
    outputTopic!: string;
}
