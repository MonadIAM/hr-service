export class Organization implements Entities.Organization.Contract {
    public id: string;
    public realm: string;

    public constructor(props: Entities.Organization.ConstructorProps) {
        this.id = props.id;
        this.realm = props.realm;
    }
}
