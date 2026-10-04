declare namespace Services.Employment {
    interface Contract extends ServiceContract {}

    interface ServiceContract {
        create: Create.Signature;
    }

    namespace Create {
        type Props = {
            input: Omit<Entities.Employment.ConstructorProps, "organization">;
            transaction: ORM.EntityManager;
            organization: Entities.Organization;
        };

        type Result = Entities.Employment;

        type Signature = (props: Props) => Result;
    }
}
