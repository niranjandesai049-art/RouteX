import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { WalletService } from './wallet.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiProperty,
} from '@nestjs/swagger';

class FundTransactionDto {
  @ApiProperty({ example: 5000, description: 'Amount of rupees' })
  amount: number;
}

@ApiTags('Wallet')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get('balance')
  @ApiOperation({ summary: 'Get current wallet balance' })
  @ApiResponse({ status: 200, description: 'Prepaid balance returned.' })
  async getBalance(@Request() req: any) {
    return this.walletService.getBalance(req.user.id);
  }

  @Post('deposit')
  @ApiOperation({ summary: 'Deposit prepaid credits into wallet' })
  @ApiResponse({ status: 201, description: 'Funds successfully deposited.' })
  async deposit(@Request() req: any, @Body() body: FundTransactionDto) {
    return this.walletService.addFunds(req.user.id, body.amount);
  }

  @Post('payout')
  @ApiOperation({ summary: 'Withdraw funds / Request carrier payout' })
  @ApiResponse({ status: 201, description: 'Payout approved and debited.' })
  async payout(@Request() req: any, @Body() body: FundTransactionDto) {
    return this.walletService.withdrawFunds(req.user.id, body.amount);
  }
}
