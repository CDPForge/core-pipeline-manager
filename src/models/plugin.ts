import { Column, DataType, Model, Table } from 'sequelize-typescript';

@Table({
    tableName: 'plugins',
    timestamps: false,
})
export default class Plugin extends Model {
    @Column({
        type: DataType.INTEGER,
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
    input_topic!: string;

    @Column({
        type: DataType.STRING,
        allowNull: true
    })
    output_topic!: string;

    @Column({
        type: DataType.DATE,
        allowNull: false,
        defaultValue: DataType.NOW,
    })
    createdAt!: Date;
}
