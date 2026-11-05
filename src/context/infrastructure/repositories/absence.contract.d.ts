declare namespace Repositories.Absence {
    interface Contract extends Repositories.Base.Contract<Entities.Absence, Repositories.Mappers.Absence.Types> {
        findDue: FindDue.Signature;
    }

    namespace FindDue {
        type Props = {
            limit: number;
            at: Date;
        };

        type Result = Promise<Entities.Absence[]>;

        type Signature = (props: Props) => Result;
    }

    interface QueryContract extends Pick<Contract, "findUniqueOrThrow" | "findMany"> {}
}
