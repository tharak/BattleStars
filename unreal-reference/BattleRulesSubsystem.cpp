#include "BattleRulesSubsystem.h"

void UBattleRulesSubsystem::InitializeSeed(const int32 Seed)
{
    RandomStream.Initialize(Seed);
}

FBattleFireResult UBattleRulesSubsystem::ResolveFire(const FBattleFireRequest& Request)
{
    FBattleFireResult Result;
    switch (Request.IncomingArc)
    {
        case EBattleArc::Front: Result.TargetNumber = 5; break;
        case EBattleArc::Flank: Result.TargetNumber = 4; break;
        case EBattleArc::Rear: Result.TargetNumber = 3; break;
    }
    if (Request.AttackerSupply == EBattleSupply::Critical)
    {
        ++Result.TargetNumber;
    }

    const int32 Strength = FMath::Max(0, Request.AttackerStrength);
    const int32 Dice = Request.AttackerMorale == EBattleMorale::Steady
        ? Strength
        : FMath::DivideAndRoundUp(Strength, 2);
    Result.Rolls.Reserve(Dice);
    for (int32 Index = 0; Index < Dice; ++Index)
    {
        const int32 Roll = RandomStream.RandRange(1, 6);
        Result.Rolls.Add(Roll);
        Result.Hits += Roll >= Result.TargetNumber ? 1 : 0;
    }

    OnShotResolved.Broadcast(Result);
    return Result;
}

FBattleMoraleResult UBattleRulesSubsystem::ResolveMorale(const FBattleMoraleRequest& Request)
{
    FBattleMoraleResult Result;
    Result.Modifier += Request.bSteadyFriendAdjacent ? 1 : 0;
    Result.Modifier += Request.bInCommand ? 1 : 0;
    Result.Modifier -= Request.bHitFromFlankOrRear ? 1 : 0;
    Result.Modifier -= Request.Supply == EBattleSupply::Normal ? 0 : 1;
    Result.Modifier -= Request.bFlagshipLost ? 1 : 0;
    Result.Roll = RandomStream.RandRange(1, 6);
    Result.Total = Result.Roll + Result.Modifier;
    Result.bPassed = Result.Total >= 4;

    OnMoraleResolved.Broadcast(Result);
    return Result;
}
