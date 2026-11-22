import type { QueryKey, UseMutationOptions, UseMutationResult, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import type { Assessment, AssessmentDeletion, AssessmentInput, DashboardSummary, HealthStatus } from './api.schemas';
import { customFetch } from '../custom-fetch';
import type { ErrorType, BodyType } from '../custom-fetch';
type AwaitedInput<T> = PromiseLike<T> | T;
type Awaited<O> = O extends AwaitedInput<infer T> ? T : never;
type SecondParameter<T extends (...args: never) => unknown> = Parameters<T>[1];
export declare const getHealthCheckUrl: () => string;
/**
 * Returns server health status
 * @summary Health check
 */
export declare const healthCheck: (options?: Parameters<typeof customFetch>[1]) => Promise<HealthStatus>;
export declare const getHealthCheckQueryKey: () => readonly ["/api/healthz"];
export declare const getHealthCheckQueryOptions: <TData = Awaited<ReturnType<typeof healthCheck>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData> & {
    queryKey: QueryKey;
};
export type HealthCheckQueryResult = NonNullable<Awaited<ReturnType<typeof healthCheck>>>;
export type HealthCheckQueryError = ErrorType<unknown>;
/**
 * @summary Health check
 */
export declare function useHealthCheck<TData = Awaited<ReturnType<typeof healthCheck>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getGetDashboardSummaryUrl: () => string;
/**
 * @summary Get the signed-in user's assessment summary
 */
export declare const getDashboardSummary: (options?: Parameters<typeof customFetch>[1]) => Promise<DashboardSummary>;
export declare const getGetDashboardSummaryQueryKey: () => readonly ["/api/dashboard/summary"];
export declare const getGetDashboardSummaryQueryOptions: <TData = Awaited<ReturnType<typeof getDashboardSummary>>, TError = ErrorType<void>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getDashboardSummary>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getDashboardSummary>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetDashboardSummaryQueryResult = NonNullable<Awaited<ReturnType<typeof getDashboardSummary>>>;
export type GetDashboardSummaryQueryError = ErrorType<void>;
/**
 * @summary Get the signed-in user's assessment summary
 */
export declare function useGetDashboardSummary<TData = Awaited<ReturnType<typeof getDashboardSummary>>, TError = ErrorType<void>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getDashboardSummary>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getListAssessmentsUrl: () => string;
/**
 * @summary List the signed-in user's assessment history
 */
export declare const listAssessments: (options?: Parameters<typeof customFetch>[1]) => Promise<Assessment[]>;
export declare const getListAssessmentsQueryKey: () => readonly ["/api/assessments"];
export declare const getListAssessmentsQueryOptions: <TData = Awaited<ReturnType<typeof listAssessments>>, TError = ErrorType<void>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listAssessments>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listAssessments>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListAssessmentsQueryResult = NonNullable<Awaited<ReturnType<typeof listAssessments>>>;
export type ListAssessmentsQueryError = ErrorType<void>;
/**
 * @summary List the signed-in user's assessment history
 */
export declare function useListAssessments<TData = Awaited<ReturnType<typeof listAssessments>>, TError = ErrorType<void>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listAssessments>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getCreateAssessmentUrl: () => string;
/**
 * @summary Save a completed assessment
 */
export declare const createAssessment: (assessmentInput: AssessmentInput, options?: Parameters<typeof customFetch>[1]) => Promise<Assessment>;
export declare const getCreateAssessmentMutationKey: () => readonly ["createAssessment"];
export declare const getCreateAssessmentMutationOptions: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createAssessment>>, TError, CreateAssessmentMutationVariables, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createAssessment>>, TError, CreateAssessmentMutationVariables, TContext>;
export type CreateAssessmentMutationResult = NonNullable<Awaited<ReturnType<typeof createAssessment>>>;
export type CreateAssessmentMutationBody = BodyType<AssessmentInput>;
export type CreateAssessmentMutationError = ErrorType<void>;
export type CreateAssessmentMutationVariables = {
    data: BodyType<AssessmentInput>;
};
/**
* @summary Save a completed assessment
*/
export declare const useCreateAssessment: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createAssessment>>, TError, CreateAssessmentMutationVariables, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createAssessment>>, TError, CreateAssessmentMutationVariables, TContext>;
export declare const getDeleteAssessmentsUrl: () => string;
/**
 * @summary Delete the signed-in user's assessment history
 */
export declare const deleteAssessments: (options?: Parameters<typeof customFetch>[1]) => Promise<AssessmentDeletion>;
export declare const getDeleteAssessmentsMutationKey: () => readonly ["deleteAssessments"];
export declare const getDeleteAssessmentsMutationOptions: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteAssessments>>, TError, void, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deleteAssessments>>, TError, void, TContext>;
export type DeleteAssessmentsMutationResult = NonNullable<Awaited<ReturnType<typeof deleteAssessments>>>;
export type DeleteAssessmentsMutationError = ErrorType<void>;
/**
* @summary Delete the signed-in user's assessment history
*/
export declare const useDeleteAssessments: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteAssessments>>, TError, void, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deleteAssessments>>, TError, void, TContext>;
export declare const getGetAssessmentUrl: (assessmentId: string) => string;
/**
 * @summary Get one assessment belonging to the signed-in user
 */
export declare const getAssessment: (assessmentId: string, options?: Parameters<typeof customFetch>[1]) => Promise<Assessment>;
export declare const getGetAssessmentQueryKey: (assessmentId: string) => readonly [`/api/assessments/${string}`];
export declare const getGetAssessmentQueryOptions: <TData = Awaited<ReturnType<typeof getAssessment>>, TError = ErrorType<void>>(assessmentId: string, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getAssessment>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getAssessment>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetAssessmentQueryResult = NonNullable<Awaited<ReturnType<typeof getAssessment>>>;
export type GetAssessmentQueryError = ErrorType<void>;
/**
 * @summary Get one assessment belonging to the signed-in user
 */
export declare function useGetAssessment<TData = Awaited<ReturnType<typeof getAssessment>>, TError = ErrorType<void>>(assessmentId: string, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getAssessment>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export {};
//# sourceMappingURL=api.d.ts.map