import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { DriverWalletService } from './driver-wallet.service';
import { CreateSettlementDto } from './dto/create-settlement.dto';
import { CreateWithdrawalDto } from './dto/create-withdrawal.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('Driver Wallet')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('wallet/driver')
export class DriverWalletController {
  constructor(private readonly driverWalletService: DriverWalletService) {}

  @Get('balance')
  @ApiOperation({ summary: 'Get driver wallet balance' })
  @ApiResponse({
    status: 200,
    description: 'Balance details retrieved successfully.',
  })
  async getBalance(@Request() req: any) {
    return this.driverWalletService.getBalance(req.user.id);
  }

  @Get('history')
  @ApiOperation({ summary: 'Get driver wallet transaction history' })
  @ApiResponse({
    status: 200,
    description: 'Transaction history retrieved successfully.',
  })
  async getHistory(@Request() req: any) {
    return this.driverWalletService.getHistory(req.user.id);
  }

  @Post('settlement')
  @ApiOperation({ summary: 'Request a bank settlement from driver wallet' })
  @ApiResponse({ status: 201, description: 'Settlement request created.' })
  async requestSettlement(
    @Request() req: any,
    @Body() dto: CreateSettlementDto,
  ) {
    return this.driverWalletService.requestSettlement(req.user.id, dto);
  }

  @Post('withdrawal')
  @ApiOperation({ summary: 'Request a payout withdrawal from driver wallet' })
  @ApiResponse({ status: 201, description: 'Withdrawal request created.' })
  async requestWithdrawal(
    @Request() req: any,
    @Body() dto: CreateWithdrawalDto,
  ) {
    return this.driverWalletService.requestWithdrawal(req.user.id, dto);
  }
}
