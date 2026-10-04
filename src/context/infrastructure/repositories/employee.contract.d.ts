declare namespace Repositories.Employee {
    interface Contract extends Repositories.Base.Contract<Entities.Employee, Repositories.Mappers.Employee.Types> {
        getLookupList: GetLookupList.Signature;
    }

    interface QueryContract extends Pick<Contract, "getLookupList" | "findUniqueOrThrow" | "findMany"> {}

    namespace GetLookupList {
        type Props = {
            organization: string;
            pagination: Pagination;
            realm: string;
            term: string;
        };

        type Item = Pick<Entities.Employee, "id" | "employeeNumber" | "lastName" | "firstName" | "middleName">;

        type Result = Promise<[Item[], number]>;

        type Signature = (props: Props) => Result;
    }
}
