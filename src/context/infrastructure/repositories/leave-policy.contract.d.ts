declare namespace Repositories.LeavePolicy {
    interface Contract extends Repositories.Base.Contract<Entities.LeavePolicy, Repositories.Mappers.LeavePolicy.Types> {
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

        type Item = Pick<Entities.LeavePolicy, "id" | "code" | "name" | "revision">;

        type Result = Promise<[Item[], number]>;

        type Signature = (props: Props) => Result;
    }
}
