import { GetServerSidePropsContext, InferGetServerSidePropsType } from "next";
import ProfileHighlight, { ExtendedUser } from "@/components/ProfileHighlight";
import Pagination from "@/components/Pagination";
import PostInput from "@/components/PostInput";
import ProfileCard from "@/components/ProfileCard";
import Skeleton from "@/components/Skeleton";
import { authOptions } from "@/server/auth";
import { prisma } from "@/server/db";
import { api } from "@/utils/api";
import { User } from "@prisma/client";
import { getServerSession } from "next-auth";
import Post from "@/components/Post";
import { useState } from "react";
import Menu from "@/components/Menu";

const AppPage = ({
    recentUsers,
    userWithoutSensitiveData
}: InferGetServerSidePropsType<typeof getServerSideProps>) => {
    const [currentPage, setCurrentPage] = useState<number>(1);
    const posts = api.post.fetchPosts.useQuery({
        page: currentPage,
        perPage: 10
    });

    return (
        <div className="flex h-[93vh]">
            <div className="w-[30%] ml-3">
                <ProfileHighlight user={userWithoutSensitiveData as ExtendedUser} />

                <Menu/>
            </div>

            <div className="w-[45%] p-3">
                <div className="h-fit mx-auto w-full mt-2">
                    <PostInput onRefresh={() => {
                        posts.refetch();
                    }} />
                </div>

                <div className="divider"></div>

                {posts.isLoading ? (
                    <div className="gap-4 flex flex-col">
                        <Skeleton height="120px" width="100%" />
                        <Skeleton height="120px" width="100%" />
                        <Skeleton height="120px" width="100%" />
                    </div>
                ) : (
                    <div className="flex h-[60vh] flex-col gap-3 overflow-scroll">
                        {posts.data?.posts?.map((el: any) => {
                            return (
                                <Post
                                    post={el}
                                    key={el.id}
                                />
                            )
                        })}
                    </div>
                )}

                <div className="w-fit mx-auto mt-5">
                    <Pagination
                        totalPages={posts.data?.totalPages as number}
                        currentPage={currentPage}
                        onPageChange={(value) => setCurrentPage(value)}
                    />
                </div>
            </div>

            <div className="p-3 w-[25%]">
                <h2 className="font-bold text-xl mb-2">Explore new profiles</h2>
                <div className="flex flex-col gap-4">
                    {recentUsers.map((el: User) => {
                        return (
                            <ProfileCard user={el} />
                        )
                    })}
                </div>
            </div>
        </div>
    )
}

export default AppPage;

export async function getServerSideProps(context: GetServerSidePropsContext) {
    const session = await getServerSession(context.req, context.res, authOptions);

    if (!session) return {
        redirect: {
            destination: "/"
        }
    };

    const recentUsers = await prisma.user.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
    });

    const userWithCounts = await prisma.user.findFirst({
        where: {
            id: session.user.id,
        },
        select: {
            id: true,
            name: true,
            slug: true,
            email: true,
            emailVerified: true,
            gender: true,
            setupDone: true,
            hobbies: true,
            age: true,
            image: true,
            bio: true,
            socials: true,
            accounts: true,
            sessions: true,
            authoredPosts: { select: { id: true } },
            following: { select: { followingId: true } },
            followers: { select: { followerId: true } },
        },
    }) as any;

    userWithCounts.postCount = userWithCounts.authoredPosts.length;
    userWithCounts.followerCount = userWithCounts.followers.length;
    userWithCounts.followingCount = userWithCounts.following.length;

    const { following, followers, ...userWithoutSensitiveData } = userWithCounts;

    return {
        props: {
            recentUsers: JSON.parse(JSON.stringify(recentUsers)),
            userWithoutSensitiveData: JSON.parse(JSON.stringify(userWithoutSensitiveData)),
            revalidate: 20
        }
    };
}