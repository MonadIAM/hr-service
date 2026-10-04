declare namespace Entities {
    type Organization = Organization.Contract;

    namespace Organization {
        interface Contract {
            id: string;
            realm: string;
        }

        type ConstructorProps = {
            id: string;
            realm: string;
        };
    }
}
