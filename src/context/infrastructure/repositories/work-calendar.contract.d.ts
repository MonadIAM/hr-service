declare namespace Repositories.WorkCalendar {
    interface Contract extends Repositories.Base.Contract<Entities.WorkCalendar, Repositories.Mappers.WorkCalendar.Types> {
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

        type Item = Pick<Entities.WorkCalendar, "id" | "code" | "name">;

        type Result = Promise<[Item[], number]>;

        type Signature = (props: Props) => Result;
    }
}
